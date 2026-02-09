# Medlux Suite (offline-first)

## Visão geral
Este repositório contém a suíte offline-first da Medlux com autenticação local, gestão de equipamentos/usuários e medições vinculadas. O armazenamento é feito via IndexedDB no navegador.

## Módulos (GitHub Pages)
- Home/Login: `front-end/index.html`
- Medlux Control (gestão): `front-end/medlux-control/index.html`
- Medlux Reflective Control (medições): `front-end/medlux-reflective-control/index.html`

## Autenticação
- Login por **ID** + **PIN (4 dígitos)**.
- Sessão gravada em `sessionStorage` (`medlux_user_id` e `medlux_role`).
- Usuário admin inicial criado automaticamente:
  - `user_id`: **RANIERI**
  - `PIN`: **2308**

## Cadastro de usuários
1. Acesse **Medlux Control** (logado como admin).
2. Na aba **Usuários**, crie um operador com ID e PIN.
3. Para resetar PIN, use o botão **Resetar PIN** (admin apenas).

## Vínculos (cautelas)
1. Na aba **Cautelas / Vínculos**, selecione usuário e equipamento.
2. Crie vínculo ativo (data de início automática).
3. Para encerrar vínculo, clique em **Encerrar vínculo**.

## Medições (Reflective)
- Operadores visualizam apenas equipamentos vinculados ativamente.
- Admin visualiza todos.
- Cada medição registra: `user_id`, `equip_id`, `data_hora`, `payload` e `created_at`.

## Banco de dados (IndexedDB)
Nome: `medlux_suite_db`

Stores:
- `users` (keyPath: `user_id`)
- `equipamentos` (keyPath: `id`)
- `vinculos` (keyPath: `id` `${user_id}|${equip_id}`)
- `medicoes` (keyPath: `id`, autoIncrement)

## Checklist de testes manuais
1. Login admin (RANIERI/2308)
2. Criar usuário PAULO/1234
3. Vincular RH01 ao PAULO
4. Login como PAULO e ver apenas RH01 no Reflective
5. Editar equipamento RH01 no Medlux Control e confirmar que salva
