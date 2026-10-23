-- Retira a execução direta de um helper interno; políticas usam a função pública autorizadora.
revoke all on function private.admin_permissoes() from public, anon, authenticated, service_role;
