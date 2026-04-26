SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict IgbzE6yQre2T9es7wgTaOQof5XQtWT0t9PueyEBrRaRI7GbrPph6TaLiH40bOxX

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'cc21309f-98b1-4ec2-9302-63c806cf26a9', '{"action":"user_signedup","actor_id":"3bb1e253-17c6-430a-b740-9c9685dfa7f2","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424182959@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:29:59.71491+00', ''),
	('00000000-0000-0000-0000-000000000000', '45c0beb9-3e3e-42cb-a586-16f0f124fe7d', '{"action":"login","actor_id":"3bb1e253-17c6-430a-b740-9c9685dfa7f2","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424182959@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:29:59.748915+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a26032c1-7e96-491c-8473-052fd29d136e', '{"action":"login","actor_id":"3bb1e253-17c6-430a-b740-9c9685dfa7f2","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424182959@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:30:00.558789+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bca7926a-45a2-4689-a460-d40c6730a99e', '{"action":"user_signedup","actor_id":"17307b13-b26e-4574-847b-29703168089e","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424183121@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:31:22.546817+00', ''),
	('00000000-0000-0000-0000-000000000000', '337bc087-dcbb-4c4a-96a5-3576edc65402', '{"action":"login","actor_id":"17307b13-b26e-4574-847b-29703168089e","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424183121@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:31:22.566123+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b2cfbc52-fa69-4cf6-871d-b7c70bdcaa45', '{"action":"login","actor_id":"17307b13-b26e-4574-847b-29703168089e","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424183121@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:31:23.174268+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c8fa1ec4-2a53-4b16-9448-d5fc947a2eb4', '{"action":"user_signedup","actor_id":"3a956b45-b456-447c-8e40-42e82eb0036b","actor_name":"Smoke Tx","actor_username":"smoke.tx.20260424183218@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:32:21.270727+00', ''),
	('00000000-0000-0000-0000-000000000000', 'daa0a6fb-fa88-4c51-abea-1be53baab4cc', '{"action":"login","actor_id":"3a956b45-b456-447c-8e40-42e82eb0036b","actor_name":"Smoke Tx","actor_username":"smoke.tx.20260424183218@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:32:21.310105+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e649a07c-6f86-4d62-b107-20f14e471e1e', '{"action":"login","actor_id":"3a956b45-b456-447c-8e40-42e82eb0036b","actor_name":"Smoke Tx","actor_username":"smoke.tx.20260424183218@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:32:22.240841+00', ''),
	('00000000-0000-0000-0000-000000000000', '91b87e27-310f-4a8b-979a-e9d50a61d43f', '{"action":"user_signedup","actor_id":"84958800-637a-4c4e-8ba2-6d6e3b22ef28","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184621@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:46:22.182852+00', ''),
	('00000000-0000-0000-0000-000000000000', '2ee74f7e-674e-48be-9fa6-e953882c1346', '{"action":"login","actor_id":"84958800-637a-4c4e-8ba2-6d6e3b22ef28","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184621@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:46:22.238408+00', ''),
	('00000000-0000-0000-0000-000000000000', '0b4c4682-7e63-4524-a344-9e39c719129c', '{"action":"login","actor_id":"84958800-637a-4c4e-8ba2-6d6e3b22ef28","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184621@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:46:23.660951+00', ''),
	('00000000-0000-0000-0000-000000000000', '9cec0065-1127-4149-a71a-1cc10ef694dc', '{"action":"login","actor_id":"84958800-637a-4c4e-8ba2-6d6e3b22ef28","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184621@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:46:24.637331+00', ''),
	('00000000-0000-0000-0000-000000000000', '2bfeecea-84d9-4764-86ae-56aa87110d5b', '{"action":"user_signedup","actor_id":"2302ff27-9716-47d9-b90d-f485c6c435a7","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184817@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:48:18.387013+00', ''),
	('00000000-0000-0000-0000-000000000000', '067273ee-6c36-4517-a323-38db6bb925ee', '{"action":"login","actor_id":"2302ff27-9716-47d9-b90d-f485c6c435a7","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184817@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:48:18.418555+00', ''),
	('00000000-0000-0000-0000-000000000000', '2591626f-1935-428a-a02b-e8774f7d6ad9', '{"action":"login","actor_id":"2302ff27-9716-47d9-b90d-f485c6c435a7","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184817@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:48:19.36009+00', ''),
	('00000000-0000-0000-0000-000000000000', '63515ed3-69ee-45f5-a3b3-886d457c8abf', '{"action":"login","actor_id":"2302ff27-9716-47d9-b90d-f485c6c435a7","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424184817@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:48:20.501813+00', ''),
	('00000000-0000-0000-0000-000000000000', '3e45014c-9937-4a7e-bf4b-34888759afae', '{"action":"user_signedup","actor_id":"69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185037@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:50:38.112636+00', ''),
	('00000000-0000-0000-0000-000000000000', '34125357-6265-4734-9c85-ae38b87d5b9a', '{"action":"login","actor_id":"69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185037@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:50:38.139715+00', ''),
	('00000000-0000-0000-0000-000000000000', '36af18d9-8d3d-4c19-b44f-1bf459658825', '{"action":"login","actor_id":"69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185037@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:50:38.702187+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e6e51407-defe-458e-8e8c-1c722cfea5ac', '{"action":"login","actor_id":"69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185037@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:50:39.375415+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e0b92faa-3b78-430f-8d50-ae37c79d0c11', '{"action":"user_signedup","actor_id":"9b8bcdc5-e696-40a0-b7a9-1bb940600edc","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185037@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:51:08.693647+00', ''),
	('00000000-0000-0000-0000-000000000000', '5e3e33e5-f3b9-4912-85b1-5bba59f45f4c', '{"action":"login","actor_id":"9b8bcdc5-e696-40a0-b7a9-1bb940600edc","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185037@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:51:08.713016+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aaf74841-0334-4bf6-a28b-80c7b0cbadc6', '{"action":"login","actor_id":"9b8bcdc5-e696-40a0-b7a9-1bb940600edc","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185037@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:51:09.619705+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bc11842d-b3b5-4f7b-80b3-cebca86fa288', '{"action":"user_signedup","actor_id":"6ac6c667-91e9-48c3-bd74-5c440ffadb4a","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185244@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:52:45.644891+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b9611c36-0082-44e2-ba75-54e0ec8c1f01', '{"action":"login","actor_id":"6ac6c667-91e9-48c3-bd74-5c440ffadb4a","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185244@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:52:45.667252+00', ''),
	('00000000-0000-0000-0000-000000000000', '582e24a1-3f75-4808-8430-053e6c63dd5c', '{"action":"login","actor_id":"6ac6c667-91e9-48c3-bd74-5c440ffadb4a","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185244@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:52:46.31695+00', ''),
	('00000000-0000-0000-0000-000000000000', '3d3e64f4-df31-45af-aae3-30441ac7eafb', '{"action":"login","actor_id":"6ac6c667-91e9-48c3-bd74-5c440ffadb4a","actor_name":"Smoke Local 1","actor_username":"smoke.local.20260424185244@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:52:46.973519+00', ''),
	('00000000-0000-0000-0000-000000000000', '1445ff5a-c7aa-465c-8638-77c9fd20ea74', '{"action":"user_signedup","actor_id":"7fbff5db-3283-472d-a8a3-53b48b2e0115","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185244@example.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2026-04-24 11:53:10.738124+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c2e8054d-7da8-4be4-b840-f31335341b00', '{"action":"login","actor_id":"7fbff5db-3283-472d-a8a3-53b48b2e0115","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185244@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:53:10.768302+00', ''),
	('00000000-0000-0000-0000-000000000000', '72a40075-035d-40fd-b541-d64bd1708b51', '{"action":"login","actor_id":"7fbff5db-3283-472d-a8a3-53b48b2e0115","actor_name":"Smoke Local 2","actor_username":"smoke.local.join.20260424185244@example.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2026-04-24 11:53:11.645942+00', '');


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', 'authenticated', 'authenticated', 'smoke.local.20260424184621@example.com', '$2a$10$38Vyjjt.WdUMMo9dgyrcXOwuKJY6ecrSB3.6Ywzu9h3J079AJJk06', '2026-04-24 11:46:22.185417+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:46:24.640126+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "84958800-637a-4c4e-8ba2-6d6e3b22ef28", "email": "smoke.local.20260424184621@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:46:22.128357+00', '2026-04-24 11:46:24.647042+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', 'authenticated', 'authenticated', 'smoke.local.20260424182959@example.com', '$2a$10$oymZsclPKINUv5lx4170duDF4dr.Rt3H5su0m/3mX1J/mX2osT39O', '2026-04-24 11:29:59.717312+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:30:00.561493+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "3bb1e253-17c6-430a-b740-9c9685dfa7f2", "email": "smoke.local.20260424182959@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:29:59.687685+00', '2026-04-24 11:30:00.569839+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '3a956b45-b456-447c-8e40-42e82eb0036b', 'authenticated', 'authenticated', 'smoke.tx.20260424183218@example.com', '$2a$10$qxOCxlCxoyHy7GJufmreQeDpeDxLSzLSLbeqeNGdtaFWF/mlbexr.', '2026-04-24 11:32:21.27293+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:32:22.244611+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "3a956b45-b456-447c-8e40-42e82eb0036b", "email": "smoke.tx.20260424183218@example.com", "full_name": "Smoke Tx", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:32:21.232318+00', '2026-04-24 11:32:22.254201+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', 'authenticated', 'authenticated', 'smoke.local.join.20260424185037@example.com', '$2a$10$1ImcN4PJBHpDlcYVVKsCIukwzYuzOudpgLapwIEolssiapbQhXax2', '2026-04-24 11:51:08.694928+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:51:09.621701+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "9b8bcdc5-e696-40a0-b7a9-1bb940600edc", "email": "smoke.local.join.20260424185037@example.com", "full_name": "Smoke Local 2", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:51:08.680788+00', '2026-04-24 11:51:09.626442+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'authenticated', 'authenticated', 'smoke.local.20260424185037@example.com', '$2a$10$wHY.cwkrZzFXdu.vW/mV8OGs.GH4wyDkC6RC7avBd71r3.byHQpim', '2026-04-24 11:50:38.11392+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:50:39.37771+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5", "email": "smoke.local.20260424185037@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:50:38.100046+00', '2026-04-24 11:50:39.383491+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '17307b13-b26e-4574-847b-29703168089e', 'authenticated', 'authenticated', 'smoke.local.20260424183121@example.com', '$2a$10$bBgApukcAfgY23adnZ8Vs.u6c3W2VSHh1hX5IGsmg.F69Mc1VitA6', '2026-04-24 11:31:22.548216+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:31:23.17607+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "17307b13-b26e-4574-847b-29703168089e", "email": "smoke.local.20260424183121@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:31:22.532126+00', '2026-04-24 11:31:23.181505+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '2302ff27-9716-47d9-b90d-f485c6c435a7', 'authenticated', 'authenticated', 'smoke.local.20260424184817@example.com', '$2a$10$mjHOYg2jCK3/SwDo7xOMAOWoM4k/JKzEoU4gZ9mHBGva9F0IkD7o2', '2026-04-24 11:48:18.389759+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:48:20.505009+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "2302ff27-9716-47d9-b90d-f485c6c435a7", "email": "smoke.local.20260424184817@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:48:18.36592+00', '2026-04-24 11:48:20.512962+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'authenticated', 'authenticated', 'smoke.local.20260424185244@example.com', '$2a$10$qz5uxcgTgBEbfcrP9hG4NOD/yos4qWfqjo5.LXInRbwSeVtYKI85W', '2026-04-24 11:52:45.646151+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:52:46.975357+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "6ac6c667-91e9-48c3-bd74-5c440ffadb4a", "email": "smoke.local.20260424185244@example.com", "full_name": "Smoke Local 1", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:52:45.627931+00', '2026-04-24 11:52:46.980242+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '7fbff5db-3283-472d-a8a3-53b48b2e0115', 'authenticated', 'authenticated', 'smoke.local.join.20260424185244@example.com', '$2a$10$G1RZRR9JVepEdUhh2meZheErT5jLgZ.yIq7/9fwCu2ir/H6gXY5PK', '2026-04-24 11:53:10.739936+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-04-24 11:53:11.648955+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "7fbff5db-3283-472d-a8a3-53b48b2e0115", "email": "smoke.local.join.20260424185244@example.com", "full_name": "Smoke Local 2", "email_verified": true, "phone_verified": false}', NULL, '2026-04-24 11:53:10.718654+00', '2026-04-24 11:53:11.656679+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('3bb1e253-17c6-430a-b740-9c9685dfa7f2', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', '{"sub": "3bb1e253-17c6-430a-b740-9c9685dfa7f2", "email": "smoke.local.20260424182959@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:29:59.708345+00', '2026-04-24 11:29:59.708394+00', '2026-04-24 11:29:59.708394+00', '2776266d-d2ee-46b0-9481-1b47bcdcea09'),
	('17307b13-b26e-4574-847b-29703168089e', '17307b13-b26e-4574-847b-29703168089e', '{"sub": "17307b13-b26e-4574-847b-29703168089e", "email": "smoke.local.20260424183121@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:31:22.542419+00', '2026-04-24 11:31:22.542455+00', '2026-04-24 11:31:22.542455+00', 'a72f60af-ef98-4aed-942d-41d62d98524d'),
	('3a956b45-b456-447c-8e40-42e82eb0036b', '3a956b45-b456-447c-8e40-42e82eb0036b', '{"sub": "3a956b45-b456-447c-8e40-42e82eb0036b", "email": "smoke.tx.20260424183218@example.com", "full_name": "Smoke Tx", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:32:21.250179+00', '2026-04-24 11:32:21.250252+00', '2026-04-24 11:32:21.250252+00', 'da44b30d-98ee-4c53-b41e-218099e8be85'),
	('84958800-637a-4c4e-8ba2-6d6e3b22ef28', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', '{"sub": "84958800-637a-4c4e-8ba2-6d6e3b22ef28", "email": "smoke.local.20260424184621@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:46:22.17299+00', '2026-04-24 11:46:22.173086+00', '2026-04-24 11:46:22.173086+00', '76c409ed-f739-4c1b-afb4-9c0cb9a92a62'),
	('2302ff27-9716-47d9-b90d-f485c6c435a7', '2302ff27-9716-47d9-b90d-f485c6c435a7', '{"sub": "2302ff27-9716-47d9-b90d-f485c6c435a7", "email": "smoke.local.20260424184817@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:48:18.379452+00', '2026-04-24 11:48:18.379513+00', '2026-04-24 11:48:18.379513+00', '05f721c7-8be9-4b24-9cdd-8a6985c5b7b2'),
	('69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '{"sub": "69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5", "email": "smoke.local.20260424185037@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:50:38.108428+00', '2026-04-24 11:50:38.108469+00', '2026-04-24 11:50:38.108469+00', 'bd4bf0be-9c3d-4176-b8e4-ac56c1cafbcc'),
	('9b8bcdc5-e696-40a0-b7a9-1bb940600edc', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', '{"sub": "9b8bcdc5-e696-40a0-b7a9-1bb940600edc", "email": "smoke.local.join.20260424185037@example.com", "full_name": "Smoke Local 2", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:51:08.689181+00', '2026-04-24 11:51:08.689231+00', '2026-04-24 11:51:08.689231+00', '15aa4604-3338-42e5-98b6-2e26b4c1a3d3'),
	('6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '{"sub": "6ac6c667-91e9-48c3-bd74-5c440ffadb4a", "email": "smoke.local.20260424185244@example.com", "full_name": "Smoke Local 1", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:52:45.640192+00', '2026-04-24 11:52:45.640255+00', '2026-04-24 11:52:45.640255+00', 'd019cf5d-c076-468f-8c36-8fbede223521'),
	('7fbff5db-3283-472d-a8a3-53b48b2e0115', '7fbff5db-3283-472d-a8a3-53b48b2e0115', '{"sub": "7fbff5db-3283-472d-a8a3-53b48b2e0115", "email": "smoke.local.join.20260424185244@example.com", "full_name": "Smoke Local 2", "email_verified": false, "phone_verified": false}', 'email', '2026-04-24 11:53:10.731314+00', '2026-04-24 11:53:10.731393+00', '2026-04-24 11:53:10.731393+00', '0c53c1ab-649f-43d5-aabe-fa3c28985349');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('f1616f3f-71a8-4bff-bdcc-46f1f759e0ef', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', '2026-04-24 11:29:59.752165+00', '2026-04-24 11:29:59.752165+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('db17650b-fdc6-4308-ae1c-9baf5a00381d', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', '2026-04-24 11:30:00.56162+00', '2026-04-24 11:30:00.56162+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('7cbecd25-a227-48d1-912d-622d0fb357c8', '17307b13-b26e-4574-847b-29703168089e', '2026-04-24 11:31:22.568003+00', '2026-04-24 11:31:22.568003+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('72f8ec27-276c-4800-a022-8232079a7b94', '17307b13-b26e-4574-847b-29703168089e', '2026-04-24 11:31:23.17615+00', '2026-04-24 11:31:23.17615+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('fcee1244-ccb5-45c0-a1a9-a2daf8c82903', '3a956b45-b456-447c-8e40-42e82eb0036b', '2026-04-24 11:32:21.313543+00', '2026-04-24 11:32:21.313543+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('fc855d01-9298-47c7-a44b-7b6a9420611d', '3a956b45-b456-447c-8e40-42e82eb0036b', '2026-04-24 11:32:22.244931+00', '2026-04-24 11:32:22.244931+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('abdad5f0-7bca-4888-a8b7-78e8575327bc', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', '2026-04-24 11:46:22.242684+00', '2026-04-24 11:46:22.242684+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('299a26d4-4a6f-4cfe-8bec-d9f4cccac9fd', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', '2026-04-24 11:46:23.664639+00', '2026-04-24 11:46:23.664639+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('7f12626f-b3c1-4d89-9f61-2b04dd4127f1', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', '2026-04-24 11:46:24.640234+00', '2026-04-24 11:46:24.640234+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('0f69db66-5230-4994-801e-9653877e9698', '2302ff27-9716-47d9-b90d-f485c6c435a7', '2026-04-24 11:48:18.422384+00', '2026-04-24 11:48:18.422384+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('5096843c-61aa-4606-8c7c-0ef7bc160ace', '2302ff27-9716-47d9-b90d-f485c6c435a7', '2026-04-24 11:48:19.363308+00', '2026-04-24 11:48:19.363308+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('8c149939-2ded-43a0-a22e-33c5a03490d0', '2302ff27-9716-47d9-b90d-f485c6c435a7', '2026-04-24 11:48:20.505165+00', '2026-04-24 11:48:20.505165+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('fa72734c-5809-4a8a-b89d-b3d6d1fae26b', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '2026-04-24 11:50:38.141557+00', '2026-04-24 11:50:38.141557+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('dc007c39-b223-4373-8328-b8dcede2bc60', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '2026-04-24 11:50:38.704206+00', '2026-04-24 11:50:38.704206+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('65d7add0-a443-40c3-902f-bbdf5ab8d36a', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '2026-04-24 11:50:39.377799+00', '2026-04-24 11:50:39.377799+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('38ad1daf-5436-45ac-bab3-3ccb463c0c90', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', '2026-04-24 11:51:08.714763+00', '2026-04-24 11:51:08.714763+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('22444b55-3946-4bf0-aa51-1d33fa8f17d6', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', '2026-04-24 11:51:09.621778+00', '2026-04-24 11:51:09.621778+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('e6fbba2c-3f25-4831-b829-978446454e0e', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '2026-04-24 11:52:45.670171+00', '2026-04-24 11:52:45.670171+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('9734cfe9-ff5d-48fb-a2e2-419697682fe8', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '2026-04-24 11:52:46.319952+00', '2026-04-24 11:52:46.319952+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('7d7177ab-9d88-4fab-be44-1f68fa051c13', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '2026-04-24 11:52:46.975471+00', '2026-04-24 11:52:46.975471+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('9263a1ee-eade-421c-83a0-98e08edb7ce2', '7fbff5db-3283-472d-a8a3-53b48b2e0115', '2026-04-24 11:53:10.771083+00', '2026-04-24 11:53:10.771083+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL),
	('eb9ffec2-6df3-4c5d-ae71-ca7c6527a69a', '7fbff5db-3283-472d-a8a3-53b48b2e0115', '2026-04-24 11:53:11.649063+00', '2026-04-24 11:53:11.649063+00', NULL, 'aal1', NULL, NULL, 'python-httpx/0.27.0', '172.18.0.1', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('f1616f3f-71a8-4bff-bdcc-46f1f759e0ef', '2026-04-24 11:29:59.761337+00', '2026-04-24 11:29:59.761337+00', 'password', 'a9ca1127-433c-47a7-b116-b5d35ef65ab8'),
	('db17650b-fdc6-4308-ae1c-9baf5a00381d', '2026-04-24 11:30:00.572235+00', '2026-04-24 11:30:00.572235+00', 'password', 'bdd68e33-be74-496b-a0a2-0f203c05f4aa'),
	('7cbecd25-a227-48d1-912d-622d0fb357c8', '2026-04-24 11:31:22.574498+00', '2026-04-24 11:31:22.574498+00', 'password', 'fcb85afb-cf80-4788-b584-e0e0438c6e1a'),
	('72f8ec27-276c-4800-a022-8232079a7b94', '2026-04-24 11:31:23.182601+00', '2026-04-24 11:31:23.182601+00', 'password', 'ef69aeb9-ecce-4e89-b148-56171229d77b'),
	('fcee1244-ccb5-45c0-a1a9-a2daf8c82903', '2026-04-24 11:32:21.327353+00', '2026-04-24 11:32:21.327353+00', 'password', '3b1a208f-f66c-4a88-8922-96c0fb397c04'),
	('fc855d01-9298-47c7-a44b-7b6a9420611d', '2026-04-24 11:32:22.255895+00', '2026-04-24 11:32:22.255895+00', 'password', '80be7609-f144-4de7-a257-4500b8796b74'),
	('abdad5f0-7bca-4888-a8b7-78e8575327bc', '2026-04-24 11:46:22.257603+00', '2026-04-24 11:46:22.257603+00', 'password', 'a14d569e-f3d2-4748-8af0-56fb3d8481d8'),
	('299a26d4-4a6f-4cfe-8bec-d9f4cccac9fd', '2026-04-24 11:46:23.676721+00', '2026-04-24 11:46:23.676721+00', 'password', '715b609d-3730-4a78-a701-3821ed0831e0'),
	('7f12626f-b3c1-4d89-9f61-2b04dd4127f1', '2026-04-24 11:46:24.648557+00', '2026-04-24 11:46:24.648557+00', 'password', '688f3bc7-de3f-41d5-bb09-ff6573644ac6'),
	('0f69db66-5230-4994-801e-9653877e9698', '2026-04-24 11:48:18.435575+00', '2026-04-24 11:48:18.435575+00', 'password', '5cd80b8d-da2d-45cf-9a91-32a6e8fee65f'),
	('5096843c-61aa-4606-8c7c-0ef7bc160ace', '2026-04-24 11:48:19.373882+00', '2026-04-24 11:48:19.373882+00', 'password', '620772e7-5b16-439d-82b7-034db2d3280b'),
	('8c149939-2ded-43a0-a22e-33c5a03490d0', '2026-04-24 11:48:20.51465+00', '2026-04-24 11:48:20.51465+00', 'password', 'cca38907-961d-4db3-a7c4-9962a204dce0'),
	('fa72734c-5809-4a8a-b89d-b3d6d1fae26b', '2026-04-24 11:50:38.146887+00', '2026-04-24 11:50:38.146887+00', 'password', '7517a20c-dda8-4281-ae7e-a58bb6f1b3ad'),
	('dc007c39-b223-4373-8328-b8dcede2bc60', '2026-04-24 11:50:38.71114+00', '2026-04-24 11:50:38.71114+00', 'password', 'a4c388ea-6a38-40d3-9fd1-b9812fdb7cfe'),
	('65d7add0-a443-40c3-902f-bbdf5ab8d36a', '2026-04-24 11:50:39.384904+00', '2026-04-24 11:50:39.384904+00', 'password', '00320f75-7e25-4b74-92a7-2e4de1fcab18'),
	('38ad1daf-5436-45ac-bab3-3ccb463c0c90', '2026-04-24 11:51:08.720688+00', '2026-04-24 11:51:08.720688+00', 'password', '61be12ab-d3a4-4856-9785-f9d6c8c3309d'),
	('22444b55-3946-4bf0-aa51-1d33fa8f17d6', '2026-04-24 11:51:09.627504+00', '2026-04-24 11:51:09.627504+00', 'password', 'ad87382f-748b-43de-b29f-cf0f641e3668'),
	('e6fbba2c-3f25-4831-b829-978446454e0e', '2026-04-24 11:52:45.677162+00', '2026-04-24 11:52:45.677162+00', 'password', '31f337eb-5e2d-4e32-a657-31dff2a0603b'),
	('9734cfe9-ff5d-48fb-a2e2-419697682fe8', '2026-04-24 11:52:46.325753+00', '2026-04-24 11:52:46.325753+00', 'password', '9ccbf9b6-0c46-45f6-ac2c-10bf2229cd04'),
	('7d7177ab-9d88-4fab-be44-1f68fa051c13', '2026-04-24 11:52:46.981159+00', '2026-04-24 11:52:46.981159+00', 'password', 'b49508b5-3ef8-4594-bb1e-efbe7faaacdf'),
	('9263a1ee-eade-421c-83a0-98e08edb7ce2', '2026-04-24 11:53:10.787405+00', '2026-04-24 11:53:10.787405+00', 'password', 'f146a636-3123-458a-8ed3-e58c8cf8bdb3'),
	('eb9ffec2-6df3-4c5d-ae71-ca7c6527a69a', '2026-04-24 11:53:11.658222+00', '2026-04-24 11:53:11.658222+00', 'password', '340de19e-0979-4dae-9805-e13237824493');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'verw6nybuywh', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', false, '2026-04-24 11:29:59.757253+00', '2026-04-24 11:29:59.757253+00', NULL, 'f1616f3f-71a8-4bff-bdcc-46f1f759e0ef'),
	('00000000-0000-0000-0000-000000000000', 2, 'fmemmxxthyei', '3bb1e253-17c6-430a-b740-9c9685dfa7f2', false, '2026-04-24 11:30:00.566086+00', '2026-04-24 11:30:00.566086+00', NULL, 'db17650b-fdc6-4308-ae1c-9baf5a00381d'),
	('00000000-0000-0000-0000-000000000000', 3, 'jl5pcqjf4mzw', '17307b13-b26e-4574-847b-29703168089e', false, '2026-04-24 11:31:22.571704+00', '2026-04-24 11:31:22.571704+00', NULL, '7cbecd25-a227-48d1-912d-622d0fb357c8'),
	('00000000-0000-0000-0000-000000000000', 4, 'n4dcjfem5sdq', '17307b13-b26e-4574-847b-29703168089e', false, '2026-04-24 11:31:23.17929+00', '2026-04-24 11:31:23.17929+00', NULL, '72f8ec27-276c-4800-a022-8232079a7b94'),
	('00000000-0000-0000-0000-000000000000', 5, 'ylasx4vakvr6', '3a956b45-b456-447c-8e40-42e82eb0036b', false, '2026-04-24 11:32:21.318682+00', '2026-04-24 11:32:21.318682+00', NULL, 'fcee1244-ccb5-45c0-a1a9-a2daf8c82903'),
	('00000000-0000-0000-0000-000000000000', 6, 'z374f43fa3r2', '3a956b45-b456-447c-8e40-42e82eb0036b', false, '2026-04-24 11:32:22.250818+00', '2026-04-24 11:32:22.250818+00', NULL, 'fc855d01-9298-47c7-a44b-7b6a9420611d'),
	('00000000-0000-0000-0000-000000000000', 7, 'wdqag4xtdgiv', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', false, '2026-04-24 11:46:22.250896+00', '2026-04-24 11:46:22.250896+00', NULL, 'abdad5f0-7bca-4888-a8b7-78e8575327bc'),
	('00000000-0000-0000-0000-000000000000', 8, '6my3uoscp2zz', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', false, '2026-04-24 11:46:23.670992+00', '2026-04-24 11:46:23.670992+00', NULL, '299a26d4-4a6f-4cfe-8bec-d9f4cccac9fd'),
	('00000000-0000-0000-0000-000000000000', 9, 'jb5g2wwv3vci', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', false, '2026-04-24 11:46:24.64432+00', '2026-04-24 11:46:24.64432+00', NULL, '7f12626f-b3c1-4d89-9f61-2b04dd4127f1'),
	('00000000-0000-0000-0000-000000000000', 10, '2ikzjhtdrjje', '2302ff27-9716-47d9-b90d-f485c6c435a7', false, '2026-04-24 11:48:18.42791+00', '2026-04-24 11:48:18.42791+00', NULL, '0f69db66-5230-4994-801e-9653877e9698'),
	('00000000-0000-0000-0000-000000000000', 11, 'cw6xwxl4vrln', '2302ff27-9716-47d9-b90d-f485c6c435a7', false, '2026-04-24 11:48:19.369228+00', '2026-04-24 11:48:19.369228+00', NULL, '5096843c-61aa-4606-8c7c-0ef7bc160ace'),
	('00000000-0000-0000-0000-000000000000', 12, 'ozkr66ui4soo', '2302ff27-9716-47d9-b90d-f485c6c435a7', false, '2026-04-24 11:48:20.510035+00', '2026-04-24 11:48:20.510035+00', NULL, '8c149939-2ded-43a0-a22e-33c5a03490d0'),
	('00000000-0000-0000-0000-000000000000', 13, 'rkp6aafnpzpv', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', false, '2026-04-24 11:50:38.144203+00', '2026-04-24 11:50:38.144203+00', NULL, 'fa72734c-5809-4a8a-b89d-b3d6d1fae26b'),
	('00000000-0000-0000-0000-000000000000', 14, 'mowfozrd4ulx', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', false, '2026-04-24 11:50:38.707975+00', '2026-04-24 11:50:38.707975+00', NULL, 'dc007c39-b223-4373-8328-b8dcede2bc60'),
	('00000000-0000-0000-0000-000000000000', 15, 'hpsivf5qha67', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', false, '2026-04-24 11:50:39.381079+00', '2026-04-24 11:50:39.381079+00', NULL, '65d7add0-a443-40c3-902f-bbdf5ab8d36a'),
	('00000000-0000-0000-0000-000000000000', 16, 'c7yglcgvbscb', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', false, '2026-04-24 11:51:08.717376+00', '2026-04-24 11:51:08.717376+00', NULL, '38ad1daf-5436-45ac-bab3-3ccb463c0c90'),
	('00000000-0000-0000-0000-000000000000', 17, 'cnqio3ih6lga', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', false, '2026-04-24 11:51:09.624493+00', '2026-04-24 11:51:09.624493+00', NULL, '22444b55-3946-4bf0-aa51-1d33fa8f17d6'),
	('00000000-0000-0000-0000-000000000000', 18, 'ine6ukcyrthz', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', false, '2026-04-24 11:52:45.673341+00', '2026-04-24 11:52:45.673341+00', NULL, 'e6fbba2c-3f25-4831-b829-978446454e0e'),
	('00000000-0000-0000-0000-000000000000', 19, 'dn5vaqfkdxhf', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', false, '2026-04-24 11:52:46.322848+00', '2026-04-24 11:52:46.322848+00', NULL, '9734cfe9-ff5d-48fb-a2e2-419697682fe8'),
	('00000000-0000-0000-0000-000000000000', 20, 'c7eeaww4o3br', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', false, '2026-04-24 11:52:46.978221+00', '2026-04-24 11:52:46.978221+00', NULL, '7d7177ab-9d88-4fab-be44-1f68fa051c13'),
	('00000000-0000-0000-0000-000000000000', 21, 'gzxg5p6eas6r', '7fbff5db-3283-472d-a8a3-53b48b2e0115', false, '2026-04-24 11:53:10.775753+00', '2026-04-24 11:53:10.775753+00', NULL, '9263a1ee-eade-421c-83a0-98e08edb7ce2'),
	('00000000-0000-0000-0000-000000000000', 22, 'vk3ow4j3clib', '7fbff5db-3283-472d-a8a3-53b48b2e0115', false, '2026-04-24 11:53:11.653997+00', '2026-04-24 11:53:11.653997+00', NULL, 'eb9ffec2-6df3-4c5d-ae71-ca7c6527a69a');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "email", "full_name", "avatar_url", "plan_type", "plan_expires_at", "group_id", "fcm_token", "created_at", "updated_at") VALUES
	('3bb1e253-17c6-430a-b740-9c9685dfa7f2', 'smoke.local.20260424182959@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:29:59.686902+00', '2026-04-24 11:29:59.686902+00'),
	('17307b13-b26e-4574-847b-29703168089e', 'smoke.local.20260424183121@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:31:22.531686+00', '2026-04-24 11:31:22.531686+00'),
	('3a956b45-b456-447c-8e40-42e82eb0036b', 'smoke.tx.20260424183218@example.com', 'Smoke Tx', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:32:21.231578+00', '2026-04-24 11:32:21.231578+00'),
	('84958800-637a-4c4e-8ba2-6d6e3b22ef28', 'smoke.local.20260424184621@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:46:22.127233+00', '2026-04-24 11:46:22.127233+00'),
	('2302ff27-9716-47d9-b90d-f485c6c435a7', 'smoke.local.20260424184817@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:48:18.365246+00', '2026-04-24 11:48:18.365246+00'),
	('69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'smoke.local.20260424185037@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:50:38.099679+00', '2026-04-24 11:50:38.099679+00'),
	('9b8bcdc5-e696-40a0-b7a9-1bb940600edc', 'smoke.local.join.20260424185037@example.com', 'Smoke Local 2', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:51:08.680354+00', '2026-04-24 11:51:08.680354+00'),
	('6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'smoke.local.20260424185244@example.com', 'Smoke Local 1', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:52:45.627516+00', '2026-04-24 11:52:45.627516+00'),
	('7fbff5db-3283-472d-a8a3-53b48b2e0115', 'smoke.local.join.20260424185244@example.com', 'Smoke Local 2', NULL, 'free', NULL, NULL, NULL, '2026-04-24 11:53:10.717933+00', '2026-04-24 11:53:10.717933+00');


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."groups" ("id", "name", "description", "owner_id", "invite_code", "invite_link", "max_members", "created_at") VALUES
	('369d8b40-a7b3-41c4-9e23-4598ff9a7dd3', 'Smoke Group', 'Frontend live smoke local', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'OY7VF0FI', 'https://catat.in/join/OY7VF0FI', 10, '2026-04-24 11:51:06.022635+00'),
	('9b6b21bf-f3ba-44bf-8e69-f55ef5d2988a', 'Smoke Group', 'Frontend live smoke local', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'DTIK1H73', 'https://catat.in/join/DTIK1H73', 10, '2026-04-24 11:53:08.890097+00');


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."wallets" ("id", "user_id", "group_id", "name", "type", "balance", "bank_name", "account_number", "is_shared", "is_active", "created_at") VALUES
	('513b0d5f-8dd1-4c92-b4be-53b518d4700f', '17307b13-b26e-4574-847b-29703168089e', NULL, 'Smoke Wallet', 'bank', 250000.00, NULL, NULL, false, true, '2026-04-24 11:31:25.302319+00'),
	('7e37b8f9-02ba-424b-8eb9-1a4bf1afc3f5', '3a956b45-b456-447c-8e40-42e82eb0036b', NULL, 'Wallet Tx', 'bank', 100000.00, NULL, NULL, false, true, '2026-04-24 11:32:25.021857+00'),
	('11128196-0eda-4884-ae99-60cdd2139387', '84958800-637a-4c4e-8ba2-6d6e3b22ef28', NULL, 'Smoke Wallet', 'bank', 250000.00, NULL, NULL, false, true, '2026-04-24 11:46:27.064224+00'),
	('797fd4b9-e089-434b-9f3c-2fc7c5005c55', '2302ff27-9716-47d9-b90d-f485c6c435a7', NULL, 'Smoke Wallet', 'bank', 250000.00, NULL, NULL, false, true, '2026-04-24 11:48:23.239905+00'),
	('b7fd688e-db93-434b-a36c-3127ac5d3762', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', NULL, 'Smoke Wallet', 'bank', 200000.00, 'BCA', NULL, false, true, '2026-04-24 11:50:42.741042+00'),
	('44f1dd1c-2700-4d0b-b525-6b5de4f4db73', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', NULL, 'Smoke Wallet', 'bank', 200000.00, 'BCA', NULL, false, true, '2026-04-24 11:52:49.650969+00');


--
-- Data for Name: bill_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bill_reminders" ("id", "user_id", "name", "amount", "due_day", "recurrence", "next_due_date", "icon", "notify_before_days", "is_active", "is_paid", "paid_at", "auto_record_wallet", "created_at") VALUES
	('2196cf0b-7fda-433c-a9af-c6143b3a8ee8', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'Internet Smoke', 299000.00, 20, 'monthly', '2026-05-20', 'wifi', '{3,1}', true, false, '2026-04-24 11:50:59.126204+00', NULL, '2026-04-24 11:50:56.536664+00'),
	('f21554b3-a655-45df-8e7b-529e92872ba8', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'Internet Smoke', 299000.00, 20, 'monthly', '2026-05-20', 'wifi', '{3,1}', true, false, '2026-04-24 11:53:03.824666+00', NULL, '2026-04-24 11:53:01.496476+00');


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."group_members" ("id", "group_id", "user_id", "role", "nickname", "status", "invited_by", "joined_at", "created_at") VALUES
	('4424dfa0-cc8b-4607-8d21-92b8c91bd5c3', '369d8b40-a7b3-41c4-9e23-4598ff9a7dd3', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'admin', NULL, 'active', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', '2026-04-24 11:51:07.71056+00', '2026-04-24 11:51:07.752155+00'),
	('be597a8e-05f5-42fb-9c8e-8fc573653410', '369d8b40-a7b3-41c4-9e23-4598ff9a7dd3', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', 'viewer', NULL, 'active', '9b8bcdc5-e696-40a0-b7a9-1bb940600edc', '2026-04-24 11:51:15.550643+00', '2026-04-24 11:51:17.21463+00'),
	('ae71360d-1cd9-49e6-976f-4f83f474b81c', '9b6b21bf-f3ba-44bf-8e69-f55ef5d2988a', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'admin', NULL, 'active', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', '2026-04-24 11:53:09.923842+00', '2026-04-24 11:53:09.958927+00'),
	('ba3b8653-8655-465b-86af-9eeaa57c4d7c', '9b6b21bf-f3ba-44bf-8e69-f55ef5d2988a', '7fbff5db-3283-472d-a8a3-53b48b2e0115', 'viewer', NULL, 'active', '7fbff5db-3283-472d-a8a3-53b48b2e0115', '2026-04-24 11:53:15.851157+00', '2026-04-24 11:53:16.939445+00');


--
-- Data for Name: import_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."transactions" ("id", "wallet_id", "user_id", "type", "amount", "category", "note", "merchant", "date", "receipt_url", "is_shared", "visibility", "group_id", "on_behalf_of", "created_by", "is_disputed", "dispute_resolved_at", "ai_extracted", "ai_confidence", "created_at", "updated_at") VALUES
	('2ebd8ddb-84f1-46ce-935a-17104eefb184', 'b7fd688e-db93-434b-a36c-3127ac5d3762', '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', 'expense', 50000.00, 'food', 'Smoke nasi padang', 'Warung Uji', '2026-04-24', NULL, false, 'private', NULL, NULL, '69e3c1a8-ebc0-462a-8ad3-fcc1fb7b11b5', false, NULL, false, NULL, '2026-04-24 11:50:48.15502+00', '2026-04-24 11:50:48.15502+00'),
	('8a6297b6-6e46-45d2-9c17-dab78b985be7', '44f1dd1c-2700-4d0b-b525-6b5de4f4db73', '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', 'expense', 50000.00, 'food', 'Smoke nasi padang', 'Warung Uji', '2026-04-24', NULL, false, 'private', NULL, NULL, '6ac6c667-91e9-48c3-bd74-5c440ffadb4a', false, NULL, false, NULL, '2026-04-24 11:52:55.021633+00', '2026-04-24 11:52:55.021633+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 22, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict IgbzE6yQre2T9es7wgTaOQof5XQtWT0t9PueyEBrRaRI7GbrPph6TaLiH40bOxX

RESET ALL;
