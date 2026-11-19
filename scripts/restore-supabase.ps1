[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupDirectory,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9]{20}$')]
    [string]$TargetProjectRef,

    [ValidatePattern('^[a-z0-9]{20}$')]
    [string]$SourceProjectRef = "wzxsjxdbxonrmlmzufpv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($TargetProjectRef -eq $SourceProjectRef) {
    throw "A restauração no projeto de origem/produção é proibida. Use um projeto temporário e vazio."
}

if (-not [IO.Path]::IsPathRooted($BackupDirectory)) {
    throw "Informe o caminho absoluto da pasta do backup, fora do repositório."
}
$resolvedBackup = [IO.Path]::GetFullPath($BackupDirectory)
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Container)) {
    throw "A pasta de backup não existe: $resolvedBackup"
}

$manifestPath = Join-Path $resolvedBackup "manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "manifest.json não encontrado. Este backup não pode ser validado."
}

try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
}
catch {
    throw "manifest.json está inválido ou não pode ser lido."
}

if ($manifest.format -ne "pedeja-supabase-logical-backup" -or $manifest.format_version -ne 1) {
    throw "Formato de backup não reconhecido."
}
if ($manifest.source_project_ref -ne $SourceProjectRef) {
    throw "O project ref do manifesto não corresponde ao SourceProjectRef informado."
}
if ($manifest.scope.full_project_backup -ne $false) {
    throw "O manifesto não identifica este arquivo como dump lógico parcial esperado."
}
if ($manifest.restore_tested -ne $false) {
    Write-Warning "O manifesto informa restore_tested diferente de false. Revise a procedência do backup."
}

$requiredFiles = @("roles.sql", "schema.sql", "data.sql")
foreach ($fileName in $requiredFiles) {
    $entries = @($manifest.files | Where-Object { $_.name -eq $fileName })
    if ($entries.Count -ne 1) {
        throw "Manifesto inválido: entrada única para $fileName não encontrada."
    }

    $filePath = Join-Path $resolvedBackup $fileName
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        throw "Backup incompleto: $fileName não foi encontrado."
    }

    $fileInfo = Get-Item -LiteralPath $filePath
    if ($fileInfo.Length -le 0 -or [long]$fileInfo.Length -ne [long]$entries[0].length_bytes) {
        throw "Tamanho inválido para $fileName. O arquivo pode estar incompleto ou alterado."
    }

    $actualHash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne [string]$entries[0].sha256) {
        throw "SHA-256 divergente em $fileName. Restauração cancelada."
    }
}

$targetHost = [Environment]::GetEnvironmentVariable("SUPABASE_RESTORE_DB_HOST", "Process")
$targetPort = [Environment]::GetEnvironmentVariable("SUPABASE_RESTORE_DB_PORT", "Process")
$targetPassword = [Environment]::GetEnvironmentVariable("SUPABASE_RESTORE_DB_PASSWORD", "Process")
$confirmation = [Environment]::GetEnvironmentVariable("SUPABASE_RESTORE_CONFIRM", "Process")
$targetUser = "postgres.$TargetProjectRef"

if ([string]::IsNullOrWhiteSpace($targetHost) -or [string]::IsNullOrWhiteSpace($targetPassword)) {
    throw "Defina SUPABASE_RESTORE_DB_HOST e SUPABASE_RESTORE_DB_PASSWORD somente no ambiente."
}
if ([string]::IsNullOrWhiteSpace($targetPort)) { $targetPort = "5432" }
if ($targetPort -notmatch '^\d{2,5}$') { throw "SUPABASE_RESTORE_DB_PORT inválida." }
if ($targetHost -notmatch '\.pooler\.supabase\.com$') {
    throw "Use o host do Session Pooler do projeto temporário (domínio *.pooler.supabase.com)."
}
if ($confirmation -cne "RESTORE:$TargetProjectRef") {
    throw "Defina SUPABASE_RESTORE_CONFIRM=RESTORE:$TargetProjectRef para confirmar o destino temporário."
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    throw "psql não foi encontrado. Instale o cliente PostgreSQL compatível antes da restauração."
}

$previousPassword = [Environment]::GetEnvironmentVariable("PGPASSWORD", "Process")
try {
    [Environment]::SetEnvironmentVariable("PGPASSWORD", $targetPassword, "Process")
    $connectionArguments = @(
        "--host", $targetHost,
        "--port", $targetPort,
        "--username", $targetUser,
        "--dbname", "postgres"
    )

    $restoreArguments = @(
        "--single-transaction",
        "--variable", "ON_ERROR_STOP=1",
        "--file", (Join-Path $resolvedBackup "roles.sql"),
        "--file", (Join-Path $resolvedBackup "schema.sql"),
        "--command", "SET session_replication_role = replica",
        "--file", (Join-Path $resolvedBackup "data.sql")
    )
    & $psql.Source @connectionArguments @restoreArguments
    if ($LASTEXITCODE -ne 0) {
        throw "A restauração falhou e a transação foi revertida."
    }

    $smokeSql = @'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
    ) THEN
        RAISE EXCEPTION 'Nenhuma tabela pública foi encontrada após a restauração.';
    END IF;
END
$$;

SELECT json_build_object(
    'public_tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'),
    'public_policies', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
    'public_functions', (
        SELECT count(*)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prokind = 'f'
    )
)::text;
'@

    $smokeArguments = @(
        "--variable", "ON_ERROR_STOP=1",
        "--tuples-only",
        "--no-align",
        "--command", $smokeSql
    )
    & $psql.Source @connectionArguments @smokeArguments
    if ($LASTEXITCODE -ne 0) {
        throw "A restauração foi executada, mas os smoke tests falharam. Preserve o projeto temporário para diagnóstico."
    }
}
finally {
    [Environment]::SetEnvironmentVariable("PGPASSWORD", $previousPassword, "Process")
}

Write-Host "Restauração lógica parcial e smoke tests concluídos no projeto temporário $TargetProjectRef."
Write-Warning "Auth, Storage, objetos de Storage, schemas de extensões, Edge Functions e configurações do projeto não fazem parte deste dump."
