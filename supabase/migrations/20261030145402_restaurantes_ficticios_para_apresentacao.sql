-- Dados fictícios identificados como DEMO para a apresentação pública do PedeJá.
-- Não representam estabelecimentos reais. As lojas são publicadas apenas no catálogo
-- de demonstração de Jacinto/MG e podem ser removidas pelos IDs reservados a1000000.

begin;

insert into public.empresas
(id, usuario_id, nome, descricao, categoria, tipo, logo, banner, taxa_entrega, pedido_minimo, status, publicado, cidade_atendimento, uf_atendimento, bairros_atendidos, tempo_estimado_min, tempo_estimado_max)
values
('a1000000-0000-4000-8000-000000000001', null, '[DEMO] Brasa Urbana', 'Hambúrgueres artesanais e porções preparados na hora. Restaurante fictício para demonstração do PedeJá.', 'Hambúrguer', 'Restaurante', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1400&h=600&fit=crop', 5.00, 18.00, true, true, 'Jacinto', 'MG', ARRAY['Centro','Vila Nova','Nossa Senhora Aparecida'], 30, 45),
('a1000000-0000-4000-8000-000000000002', null, '[DEMO] Forno da Vila', 'Pizzas fictícias de massa artesanal para mostrar o cardápio e o fluxo de pedidos.', 'Pizza', 'Restaurante', 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=1400&h=600&fit=crop', 6.00, 25.00, true, true, 'Jacinto', 'MG', ARRAY['Centro','Vila Nova','Nossa Senhora Aparecida'], 35, 55),
('a1000000-0000-4000-8000-000000000003', null, '[DEMO] Tempero da Casa', 'Comida caseira fictícia, com pratos feitos e marmitas para a apresentação do sistema.', 'Comida Brasileira', 'Restaurante', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1400&h=600&fit=crop', 4.50, 16.00, true, true, 'Jacinto', 'MG', ARRAY['Centro','Vila Nova','Nossa Senhora Aparecida'], 25, 40),
('a1000000-0000-4000-8000-000000000004', null, '[DEMO] Açaí Tropical', 'Açaí, vitaminas e combinações fictícias para demonstrar a navegação e personalização do pedido.', 'Açaí', 'Restaurante', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=400&fit=crop', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1400&h=600&fit=crop', 4.00, 12.00, true, true, 'Jacinto', 'MG', ARRAY['Centro','Vila Nova','Nossa Senhora Aparecida'], 20, 35)
on conflict (id) do update set
nome=excluded.nome, descricao=excluded.descricao, categoria=excluded.categoria, tipo=excluded.tipo,
logo=excluded.logo, banner=excluded.banner, taxa_entrega=excluded.taxa_entrega,
pedido_minimo=excluded.pedido_minimo, status=excluded.status, publicado=excluded.publicado,
cidade_atendimento=excluded.cidade_atendimento, uf_atendimento=excluded.uf_atendimento,
bairros_atendidos=excluded.bairros_atendidos, tempo_estimado_min=excluded.tempo_estimado_min,
tempo_estimado_max=excluded.tempo_estimado_max;

insert into public.categorias (id, empresa_id, nome, ordem, ativo, unidade_id)
select v.category_id::uuid, v.company_id::text, v.category_name, 1, true, u.id
from (values
('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000011','Hambúrgueres'),
('a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000012','Pizzas'),
('a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000013','Pratos feitos'),
('a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000014','Açaí e sobremesas')
) as v(company_id,category_id,category_name)
join public.empresa_unidades u on u.empresa_id=v.company_id and u.principal=true
on conflict (id) do update set nome=excluded.nome, ativo=true, unidade_id=excluded.unidade_id;

insert into public.produtos
(id, empresa_id, categoria_id, nome, descricao, imagem, preco, disponivel, unidade_id)
select v.product_id::uuid, v.company_id::text, v.category_id::text, v.product_name, v.description, v.image, v.price, true, u.id
from (values
('a1000000-0000-4000-8000-000000000101','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000011','Brasa Clássico','Pão brioche, hambúrguer artesanal, queijo e molho da casa.','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=700&fit=crop',28.90),
('a1000000-0000-4000-8000-000000000102','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000011','Cheddar & Bacon','Hambúrguer, cheddar cremoso, bacon crocante e cebola caramelizada.','https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=900&h=700&fit=crop',32.90),
('a1000000-0000-4000-8000-000000000103','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000011','Batata da Casa','Batatas crocantes com páprica e molho especial.','https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&h=700&fit=crop',16.00),
('a1000000-0000-4000-8000-000000000201','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000012','Pizza Margherita','Molho de tomate, muçarela, tomate e manjericão.','https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&h=700&fit=crop',42.90),
('a1000000-0000-4000-8000-000000000202','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000012','Pizza Calabresa','Calabresa fatiada, cebola e muçarela.','https://images.unsplash.com/photo-1628840042765-356cda07504e?w=900&h=700&fit=crop',46.90),
('a1000000-0000-4000-8000-000000000203','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000012','Pizza Quatro Queijos','Combinação cremosa de quatro queijos.','https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&h=700&fit=crop',49.90),
('a1000000-0000-4000-8000-000000000301','a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000013','Frango Grelhado','Arroz, feijão, frango grelhado e salada fresca.','https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=700&fit=crop',24.90),
('a1000000-0000-4000-8000-000000000302','a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000013','Parmegiana','Filé empanado com molho de tomate, queijo, arroz e batata.','https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=700&fit=crop',29.90),
('a1000000-0000-4000-8000-000000000303','a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000013','Marmita Caseira','Carne de panela, arroz, feijão e legumes.','https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&h=700&fit=crop',22.90),
('a1000000-0000-4000-8000-000000000401','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000014','Açaí 300 ml','Açaí cremoso com banana e granola.','https://images.unsplash.com/photo-1590301157890-4810ed352733?w=900&h=700&fit=crop',17.90),
('a1000000-0000-4000-8000-000000000402','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000014','Açaí 500 ml','Açaí cremoso com leite em pó e morango.','https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=900&h=700&fit=crop',24.90),
('a1000000-0000-4000-8000-000000000403','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000014','Vitamina Tropical','Vitamina gelada de frutas com leite.','https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=900&h=700&fit=crop',14.90)
) as v(product_id,company_id,category_id,product_name,description,image,price)
join public.empresa_unidades u on u.empresa_id=v.company_id and u.principal=true
on conflict (id) do update set
categoria_id=excluded.categoria_id, nome=excluded.nome, descricao=excluded.descricao,
imagem=excluded.imagem, preco=excluded.preco, disponivel=true, unidade_id=excluded.unidade_id;

commit;
