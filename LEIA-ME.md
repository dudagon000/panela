# Panelinha — seu organizador de cozinha

Primeira versão do aplicativo, feita para publicar gratuitamente no **GitHub Pages** e salvar os dados no **Supabase**.

## O que já funciona nesta versão

- Cadastro e login com e-mail e senha.
- Geladeira: ingredientes, quantidades, unidades e validade.
- Receitas: categoria, facilidade, rendimento, ingredientes e modo de preparo; permite editar e excluir.
- Cardápio semanal: 15 espaços (almoço e jantar de segunda a sexta, almoço de sábado e domingo e lanches nos jantares de sexta, sábado e domingo).
- Sugestão automática simples, priorizando receitas cujos ingredientes já estão na geladeira.
- Lista de compras consolidada a partir das receitas escolhidas.
- Preparação esperta: ingredientes em comum e itens próximos do vencimento.

## 1. Criar o banco gratuito no Supabase

1. Crie uma conta em https://supabase.com/ e um projeto.
2. No projeto, abra **SQL Editor**.
3. Abra o arquivo `supabase.sql`, copie todo o conteúdo e execute no SQL Editor.
4. Em **Project Settings > API**, copie:
   - Project URL
   - `anon` / publishable public key (a chave pública do projeto; nunca use a `service_role` no site).

## 2. Ligar o site ao banco

1. Abra `app.js`.
2. No começo do arquivo, substitua:
   - `COLE_AQUI_A_URL_DO_SUPABASE` pela Project URL.
   - `COLE_AQUI_A_CHAVE_ANON_PUBLICA` pela chave `anon` / publishable.
3. Salve o arquivo.

A chave pública pode estar no código do navegador quando as políticas de segurança (RLS) estão ativadas. **Nunca coloque a chave `service_role` no site.**

## 3. Publicar grátis pelo GitHub Pages

1. No GitHub, crie um repositório novo, por exemplo `panelinha`.
2. Envie `index.html`, `style.css`, `app.js` e `supabase.sql` (pode enviar também este README).
3. No repositório, abra **Settings > Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Escolha a branch `main` e a pasta `/ (root)`, depois clique em **Save**.
6. Aguarde a publicação. O GitHub mostrará o endereço do site na própria tela de Pages.

## 4. Configurar o login

No Supabase, abra **Authentication > URL Configuration**:
- Em **Site URL**, coloque o endereço publicado pelo GitHub Pages.
- Em **Redirect URLs**, adicione também o mesmo endereço.
- Para testes locais, você pode adicionar `http://localhost:8000`.

Se o Supabase pedir confirmação de e-mail no cadastro, confira a caixa de entrada. Para um primeiro teste, você também pode ajustar a confirmação em **Authentication > Providers > Email**, nas opções do provedor de e-mail.

## 5. Testar no computador antes de publicar (opcional)

Abra um terminal dentro da pasta e execute:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`. Não é necessário para publicar no GitHub Pages.

## Observações desta primeira versão

- O cardápio é editável manualmente. A sugestão automática é uma primeira heurística, não um nutricionista nem um planejador perfeito.
- A lista de compras compara nomes de ingredientes e quantidades. Para evitar diferenças, use nomes consistentes (por exemplo, sempre “tomate”, não alternar entre “tomate” e “tomates”).
- As quantidades dos ingredientes são somadas por nome e unidade. A comparação com a geladeira usa o total cadastrado daquele ingrediente.
- O controle de repetição de receitas na sugestão automática tenta limitar proteínas a duas aparições e outras categorias a três, mas é uma regra inicial simplificada.
- A interface está preparada para crescer. Próximas melhorias podem incluir foto das receitas, edição da geladeira, escala automática das porções, filtros, checklist de compras persistente e regras mais avançadas para montar refeições completas com proteína + acompanhamento + legumes.

## Privacidade

As tabelas usam Row Level Security (RLS), com políticas para que cada conta veja e altere apenas os próprios registros. Não compartilhe sua chave `service_role`. Use somente a chave pública `anon`/publishable no `app.js`.
