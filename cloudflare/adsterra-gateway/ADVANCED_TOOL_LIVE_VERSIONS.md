# Separately deployed ad Worker versions

Cloudflare versions recorded on 5 November 2026. The advanced-tool Workers were migrated from Service Worker syntax to an equivalent module fetch entry while preserving embedded source, existing ad units, bindings and runtime. A subsequent update added preconnect hints and a dismissible notice only when both the native and Social Bar script requests fail.

The table is a rollback and reconciliation record. The original modules captured from these deployments are stored under `cloudflare/advanced-tool-workers/`; future independent deployments must still reconcile their current live source or they can remove changes made after this snapshot. Knit Gauge, ICU and Puzzle Hunt Smartlink candidates, and the Knit Gauge recovery candidate, were checked using zero-percent version overrides before activation. No synthetic ad clicks or ad-refresh loops were used.

| Worker | Original version | Smartlink version | Recovery version |
| --- | --- | --- | --- |
| aafnai-advanced-knit-gauge-v15 | 87c9ebb2-97e7-4910-b0d3-61d91b853030 | 4b8f008d-8014-455a-b3cf-1c3f20920ba0 | 2409524e-6776-4929-8503-c7acb5ebd86e |
| aafnai-advanced-tournament-v15 | 1d212c4e-4ec1-42a3-b3cd-22dd2819b8c6 | bcb2fd75-c304-42c0-a8e7-9c9283942910 | 52f18eec-c082-420f-97a0-809a11a193de |
| aafnai-advanced-warp-planner-v15 | 3ef1aa2f-2d76-4e75-ba55-624c528ebc4e | 532933d6-fb29-462a-9497-2aa75bdcf7f0 | b80eeb4a-6c47-41d7-990a-9fdedf64d6d0 |
| aafnai-advanced-audio-loop-v15 | 9f40fb7a-476c-47c1-9779-8b0fa6e9257a | 7023ec23-61ff-498c-921c-684618dbc3e2 | 294d0603-10fe-45ba-bdac-35d2ce18d6dc |
| aafnai-advanced-fabric-nesting-v15 | 84b6367c-e478-4165-b0f6-d2c4f65b6fc2 | db67fef0-0100-4061-ba8f-0d1907c8ba23 | d3b030bb-9bfc-4046-80a4-04b36fc02689 |
| aafnai-advanced-card-bundle-v15 | 02c7e410-b663-4cf0-89de-30087bbc1456 | 07509ac1-b113-4f5e-af69-8644573781b9 | 6beda88c-ad6e-4137-a139-8c9d316de17c |
| aafnai-advanced-bead-inventory-v15 | 040a7bde-1294-4617-89a4-bcd0e8ed55a4 | 7eb09add-61c6-4a29-b197-6b20c3ff5325 | 22fd2447-30ce-49ed-8a34-7f848164f312 |
| aafnai-advanced-chordpro-v15 | 3cc1ed86-f11d-40f6-b1cd-d0900f160b6d | f72e3c88-e075-4b5a-844a-fd6703d5103d | 7d15f673-1c03-4f3f-a7aa-cf443486575d |
| aafnai-advanced-font-language-v15 | fcad1fb8-eb13-4fb4-9fa7-2fd90f88b0e9 | 2b9e1617-c0b4-4e18-b054-66dcf22f7fe8 | 72479a1d-34e3-4edc-8566-effee002f1e7 |
| aafnai-advanced-epub-diff-v15 | b4002c4d-9318-49fe-977b-1490608d4d20 | 9c8bc1f0-1fcf-41da-9893-b200c4eb7fec | 8c6d9bd6-9155-4d8d-9786-3da49a727e34 |
| aafnai-advanced-quiz-bank-v15 | 02af4a3f-513c-44ec-bfd5-e57d76e41127 | 5457172f-e691-40c1-af8a-d90ba21acac1 | 63a1ed53-eff0-47f9-9021-3666dc9f341a |
| aafnai-advanced-survey-branch-v15 | dd8e5221-8343-487e-950a-5a163eccb92e | 31f97983-309f-4f7a-a2f0-f3a954c63614 | feefa059-a0fa-4a86-a569-4e7648f902ab |
| aafnai-advanced-story-continuity-v15 | 0e777f76-0697-4606-a11e-d57d471ac3aa | 2f37086c-cb7c-4b82-95c2-6c3f3fb70060 | 33466df5-0185-4261-b459-3e8e5fc588a2 |
| aafnai-advanced-rehearsal-planner-v15 | 6f728a3d-532f-469b-8217-72b05b17420e | 66548ed4-8d10-4dba-8064-653b67492489 | 86c1f51d-8694-4d0b-89d4-fe60db70c3fa |
| aafnai-advanced-qmk-simulator-v15 | a63f59e2-64d4-4dca-9404-ac08a5792851 | 1d517838-fb30-41b4-888a-9b4286e9bd45 | 340bdeec-00dc-430c-afb9-b7cb0fc33d37 |
| aafnai-advanced-pgn-diff-v15 | d3caf798-a72a-4603-b5f2-11b3f69ec0fe | 23f3c23d-a776-426d-b952-f754cdbec9ba | 3063dd56-8cae-4c78-b1cc-161949c31662 |
| aafnai-advanced-exposure-sheet-v15 | 533ce632-c881-4fed-869f-96cc86360658 | 4423c81d-f578-4ceb-98cc-188a3b428ba5 | a32bb5b9-8551-4a36-a535-d2430474510a |
| aafnai-advanced-coding-reconcile-v15 | ad73fede-8431-4a29-9c94-e05d3b5bebcf | b06bd15f-2377-4cef-9235-30fae650c535 | ab7cc97c-c544-4323-851b-5e6c4e28b8f7 |
| aafnai-advanced-icu-validator-v15 | 2da4b5ed-6929-4225-b99d-2c557fc74d49 | 18e66898-54e4-40bb-9880-38424561616d | d44ba6c3-2812-4c7c-91a1-cbaf25204ef6 |
| aafnai-advanced-puzzle-hunt-v15 | b82df89f-9295-4dcc-9cf0-49cdaa9cc979 | e6d270d2-c815-465d-aefd-b1025351a422 | 3f853d4c-5d93-4b2f-b35a-bbe0eca57cd1 |
| patro-day-atlas | 6023f463-45c0-4f3c-807b-d0252ae473df | 0bb3e18f-4fdb-4704-beb8-cb9d3572e6ae | 00a6db43-18f3-4405-94e6-4923fd0b4f61 |

The library, root Worker and gateway have separate deployment entries and source snapshots. Preserve their configuration, routes and root assets as described in README.md.

## Search discovery rollout

The following 20 versions wrap the exact prior deployed Worker module with `advanced-tool-entry.mjs` and `advanced-tool-discovery.mjs`. The Knit Gauge candidate was checked at 0% traffic through its service binding before rollout. Each candidate retained its preceding Worker’s bindings, runtime and fetch handler. Existing versions remain available for rollback; source hashes and routes are recorded in `cloudflare/advanced-tool-workers/manifest.json`.

| Worker | Previous recovery version | Discovery version |
| --- | --- | --- |
| aafnai-advanced-audio-loop-v15 | 294d0603-10fe-45ba-bdac-35d2ce18d6dc | 6afbf742-82d7-4225-b672-c4c491856521 |
| aafnai-advanced-bead-inventory-v15 | 22fd2447-30ce-49ed-8a34-7f848164f312 | efe10d8e-c02e-460a-8fa4-680c13464008 |
| aafnai-advanced-card-bundle-v15 | 6beda88c-ad6e-4137-a139-8c9d316de17c | 4aec597b-d238-4bd4-a10f-3cf28911d978 |
| aafnai-advanced-chordpro-v15 | 7d15f673-1c03-4f3f-a7aa-cf443486575d | e5dc8cd3-739d-4fc8-98b6-acfb13eef91e |
| aafnai-advanced-coding-reconcile-v15 | ab7cc97c-c544-4323-851b-5e6c4e28b8f7 | b5f80474-ea6a-4a3a-81ea-183bcfd2419d |
| aafnai-advanced-epub-diff-v15 | 8c6d9bd6-9155-4d8d-9786-3da49a727e34 | 10c0b61e-5810-4330-b061-603f6cf847c1 |
| aafnai-advanced-exposure-sheet-v15 | a32bb5b9-8551-4a36-a535-d2430474510a | 86709b67-9b8f-4e0a-8d39-cb0aed569fbc |
| aafnai-advanced-fabric-nesting-v15 | d3b030bb-9bfc-4046-80a4-04b36fc02689 | c0acd189-4c00-4dde-b63d-1539469b2d82 |
| aafnai-advanced-font-language-v15 | 72479a1d-34e3-4edc-8566-effee002f1e7 | 77f0c2c0-220c-4294-9937-af3e322a6f4c |
| aafnai-advanced-icu-validator-v15 | d44ba6c3-2812-4c7c-91a1-cbaf25204ef6 | b1c148e7-6260-4cbc-9b26-35e10d9db6ce |
| aafnai-advanced-knit-gauge-v15 | 2409524e-6776-4929-8503-c7acb5ebd86e | 5d128c44-6230-4bbb-b373-8837374c0f4a |
| aafnai-advanced-pgn-diff-v15 | 3063dd56-8cae-4c78-b1cc-161949c31662 | bd476796-151f-4024-9ceb-cb28ed185a7b |
| aafnai-advanced-puzzle-hunt-v15 | 3f853d4c-5d93-4b2f-b35a-bbe0eca57cd1 | 458d0aeb-130a-4318-9939-0ba09d3deeb4 |
| aafnai-advanced-qmk-simulator-v15 | 340bdeec-00dc-430c-afb9-b7cb0fc33d37 | 99b91f14-7420-4cf6-a3ec-323cda6c85b6 |
| aafnai-advanced-quiz-bank-v15 | 63a1ed53-eff0-47f9-9021-3666dc9f341a | 4541420d-a85a-4573-8b11-2627961d9f95 |
| aafnai-advanced-rehearsal-planner-v15 | 86c1f51d-8694-4d0b-89d4-fe60db70c3fa | 036bb7b8-ff6f-4344-b0bd-6504ed62859d |
| aafnai-advanced-story-continuity-v15 | 33466df5-0185-4261-b459-3e8e5fc588a2 | 163ab53b-88b2-4e42-b2b6-4fecea310794 |
| aafnai-advanced-survey-branch-v15 | feefa059-a0fa-4a86-a569-4e7648f902ab | 6a6fc540-54d7-485c-89bf-c052ee4321b2 |
| aafnai-advanced-tournament-v15 | 52f18eec-c082-420f-97a0-809a11a193de | 26d9d0b4-02a4-4c95-947f-879b66e576c9 |
| aafnai-advanced-warp-planner-v15 | b80eeb4a-6c47-41d7-990a-9fdedf64d6d0 | ae06455d-e023-46c6-9fca-d6f19f1e3219 |

## Ad diagnostics rollout

The following 20 versions preserve the exact prior modules and bindings and add a wrapper that sends voluntary interaction and delivery diagnostics to the existing GA4 property. They do not add a telemetry Worker invocation. The previous discovery versions are retained for rollback.

| Worker | Previous version | Diagnostics version |
| --- | --- | --- |
| aafnai-advanced-audio-loop-v15 | 6afbf742-82d7-4225-b672-c4c491856521 | 3634f2ca-e4d1-4ebb-85b2-9bbaa489f470 |
| aafnai-advanced-bead-inventory-v15 | efe10d8e-c02e-460a-8fa4-680c13464008 | ba002f5b-1a7f-4b5b-af47-8da24b5e77a3 |
| aafnai-advanced-card-bundle-v15 | 4aec597b-d238-4bd4-a10f-3cf28911d978 | 4368bb3f-48d7-4f1e-affa-ec13c82f33b4 |
| aafnai-advanced-chordpro-v15 | e5dc8cd3-739d-4fc8-98b6-acfb13eef91e | 7d9ea1fc-15d8-4b47-8670-493c2aff5b19 |
| aafnai-advanced-coding-reconcile-v15 | b5f80474-ea6a-4a3a-81ea-183bcfd2419d | 622e6ac3-6c2d-423c-8612-7e287a20d135 |
| aafnai-advanced-epub-diff-v15 | 10c0b61e-5810-4330-b061-603f6cf847c1 | 20cd0ec4-fc54-4674-a8dc-a975e9d2bbd9 |
| aafnai-advanced-exposure-sheet-v15 | 86709b67-9b8f-4e0a-8d39-cb0aed569fbc | df0a9021-46c0-43ca-b48b-bc276dcf8468 |
| aafnai-advanced-fabric-nesting-v15 | c0acd189-4c00-4dde-b63d-1539469b2d82 | 3089dc2e-e8df-4307-9282-4e96f3ce7b21 |
| aafnai-advanced-font-language-v15 | 77f0c2c0-220c-4294-9937-af3e322a6f4c | d0b30232-2b91-4776-9203-2555d5f94c04 |
| aafnai-advanced-icu-validator-v15 | b1c148e7-6260-4cbc-9b26-35e10d9db6ce | 8e104cb5-dfe3-451c-9a9a-97ad761cbc40 |
| aafnai-advanced-knit-gauge-v15 | 5d128c44-6230-4bbb-b373-8837374c0f4a | 4fc071bd-5b5d-4ab9-9907-3c2800427be2 |
| aafnai-advanced-pgn-diff-v15 | bd476796-151f-4024-9ceb-cb28ed185a7b | 16d5d799-5f05-4c9d-840e-b7c040bf6899 |
| aafnai-advanced-puzzle-hunt-v15 | 458d0aeb-130a-4318-9939-0ba09d3deeb4 | 821a18d6-a186-4e10-ab2b-edecfd9be7fb |
| aafnai-advanced-qmk-simulator-v15 | 99b91f14-7420-4cf6-a3ec-323cda6c85b6 | 09f2defa-91ea-4612-8328-731e4ddd5727 |
| aafnai-advanced-quiz-bank-v15 | 4541420d-a85a-4573-8b11-2627961d9f95 | 6854df9d-098e-41db-83d7-69c45d522857 |
| aafnai-advanced-rehearsal-planner-v15 | 036bb7b8-ff6f-4344-b0bd-6504ed62859d | d7c62a20-0202-4998-afcc-2b38a96719a5 |
| aafnai-advanced-story-continuity-v15 | 163ab53b-88b2-4e42-b2b6-4fecea310794 | 33874e9d-f0d4-4fed-ac21-8f30f93cdf2c |
| aafnai-advanced-survey-branch-v15 | 6a6fc540-54d7-485c-89bf-c052ee4321b2 | 344d9798-20e8-41a7-8058-6e1f0dcdd59e |
| aafnai-advanced-tournament-v15 | 26d9d0b4-02a4-4c95-947f-879b66e576c9 | 5847da9f-7349-43b5-a630-ac4d32e4017f |
| aafnai-advanced-warp-planner-v15 | ae06455d-e023-46c6-9fca-d6f19f1e3219 | 6eb0b38f-8c34-4800-a3e5-2fdfe1a1bf93 |
