begin;

-- Esta migração corresponde ao histórico remoto de remoção das tabelas legadas
-- de cardápio com nomenclatura inglesa. O schema atual não possui essas tabelas;
-- a migração é mantida para preservar a mesma sequência/versionamento do ambiente remoto.

commit;
