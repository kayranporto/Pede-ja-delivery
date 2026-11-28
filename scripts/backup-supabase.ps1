[CmdletBinding()]
param(
    [ValidatePattern('^[a-z0-9]{20}$')]
    [string]$ProjectRef = "wzxsjxdbxonrmlmzufpv",

    [string]$OutputDirectory = (Join-Path $HOME "Backups\PedeJa")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$cliVersion = "2.115.0"
$databasePassword = [Environment]::GetEnvironmentVariable("SUPABASE_DB_PASSWORD", "Process")
if ([string]::IsNullOrWhiteSpace($databasePassword)) {
    throw "Defina SUPABASE_DB_PASSWORD no ambiente antes de executar o backup."
}

$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$configPath = Join-Path $repositoryRoot "supabase/config.toml"
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw "supabase/config.toml não foi encontrado. Execute o script a partir de um clone válido do PedeJá."
}

$backupRoot = [IO.Path]::GetFullPath($OutputDirectory)
$repositoryPrefix = $repositoryRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (
    $backupRoot.Equals($repositoryRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $backupRoot.StartsWith($repositoryPrefix, [StringComparison]::OrdinalIgnoreCase)
) {
    throw "O backup deve ficar fora do repositório Git. Use uma pasta privada, por exemplo $HOME\Backups\PedeJa."
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm não foi encontrado. Instale uma versão compatível com o projeto."
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop não foi encontrado. O Supabase CLI usa Docker para executar pg_dump."
}

& docker info --format '{{.ServerVersion}}' *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker não está em execução. Abra o Docker Desktop e tente novamente."
}

$previousDbPassword = [Environment]::GetEnvironmentVariable("SUPABASE_DB_PASSWORD", "Process")
function Invoke-SupabaseCli {
    param([string[]]$Arguments)

    & npx --yes "supabase@$cliVersion" @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "O Supabase CLI falhou ao executar: supabase $($Arguments -join ' ')"
    }
}

try {
    # O CLI lê a senha pelo ambiente durante o link e a guarda no armazenamento
    # nativo de credenciais quando disponível. A senha não vai na linha de comando.
    Invoke-SupabaseCli -Arguments @("link", "--project-ref", $ProjectRef)
}
finally {
    [Environment]::SetEnvironmentVariable("SUPABASE_DB_PASSWORD", $previousDbPassword, "Process")
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$destination = Join-Path $backupRoot "$ProjectRef-$timestamp"
New-Item -ItemType Directory -Path $destination -Force | Out-Null

$requiredFiles = @("roles.sql", "schema.sql", "data.sql")
try {
    Invoke-SupabaseCli -Arguments @("db", "dump", "--linked", "--role-only", "--file", (Join-Path $destination "roles.sql"))
    Invoke-SupabaseCli -Arguments @("db", "dump", "--linked", "--file", (Join-Path $destination "schema.sql"))
    Invoke-SupabaseCli -Arguments @(
        "db", "dump", "--linked",
        "--data-only",
        "--use-copy",
        "--exclude", "storage.buckets_vectors",
        "--exclude", "storage.vector_indexes",
        "--file", (Join-Path $destination "data.sql")
    )

    $fileEntries = @()
    foreach ($fileName in $requiredFiles) {
        $filePath = Join-Path $destination $fileName
        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
            throw "Backup incompleto: $fileName não foi criado."
        }

        $fileInfo = Get-Item -LiteralPath $filePath
        if ($fileInfo.Length -le 0) {
            throw "Backup inválido: $fileName está vazio."
        }

        $hash = Get-FileHash -LiteralPath $filePath -Algorithm SHA256
        $fileEntries += [ordered]@{
            name = $fileName
            length_bytes = [long]$fileInfo.Length
            sha256 = $hash.Hash.ToLowerInvariant()
        }
    }

    $manifest = [ordered]@{
        format = "pedeja-supabase-logical-backup"
        format_version = 1
        source_project_ref = $ProjectRef
        generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        supabase_cli_version = $cliVersion
        postgres_major_version = 17
        files = $fileEntries
        scope = [ordered]@{
            full_project_backup = $false
            included = @(
                "Custom database roles included by the Supabase CLI",
                "Schema objects in schemas included by the Supabase CLI",
                "Data in schemas included by the Supabase CLI"
            )
            excluded = @(
                "Supabase-managed auth schema and Auth user records",
                "Supabase-managed storage schema and Storage objects",
                "Extension-owned schemas and their objects",
                "Edge Functions, Auth provider settings, project secrets and dashboard configuration"
            )
            note = "This is a filtered logical database dump, not a complete Supabase project backup."
        }
        restore_tested = $false
    }

    $manifestJson = $manifest | ConvertTo-Json -Depth 8
    Set-Content -LiteralPath (Join-Path $destination "manifest.json") -Value $manifestJson -Encoding UTF8
}
catch {
    Set-Content -LiteralPath (Join-Path $destination "INCOMPLETO.txt") -Value $_.Exception.Message -Encoding UTF8
    throw
}

Write-Host "Backup lógico criado em: $destination"
Write-Host "SHA-256 registrado em manifest.json."
Write-Warning "Este dump não inclui Auth, Storage, objetos de Storage, schemas de extensões, Edge Functions nem configuração do projeto."
