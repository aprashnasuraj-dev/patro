# Separately deployed ad Worker versions

Cloudflare versions recorded on 5 November 2026 after adding the publisher's second Smartlink. The advanced-tool Workers were migrated from Service Worker syntax to an equivalent module fetch entry while preserving their embedded source, existing ad units, bindings and runtime. The primary Smartlink is the new one; the old Smartlink remains at the bottom.

The table is a rollback and reconciliation record, not a complete source snapshot. Future deployments of an independently managed Worker must first reconcile its live source; an old deployment can remove these changes. The Knit Gauge, ICU and Puzzle Hunt candidates were tested through zero-percent version overrides before activation. No synthetic ad clicks or ad-refresh loops were used.

| Worker | Previous version | Updated version |
| --- | --- | --- |
| aafnai-advanced-knit-gauge-v15 | 87c9ebb2-97e7-4910-b0d3-61d91b853030 | 4b8f008d-8014-455a-b3cf-1c3f20920ba0 |
| aafnai-advanced-tournament-v15 | 1d212c4e-4ec1-42a3-b3cd-22dd2819b8c6 | bcb2fd75-c304-42c0-a8e7-9c9283942910 |
| aafnai-advanced-warp-planner-v15 | 3ef1aa2f-2d76-4e75-ba55-624c528ebc4e | 532933d6-fb29-462a-9497-2aa75bdcf7f0 |
| aafnai-advanced-audio-loop-v15 | 9f40fb7a-476c-47c1-9779-8b0fa6e9257a | 7023ec23-61ff-498c-921c-684618dbc3e2 |
| aafnai-advanced-fabric-nesting-v15 | 84b6367c-e478-4165-b0f6-d2c4f65b6fc2 | db67fef0-0100-4061-ba8f-0d1907c8ba23 |
| aafnai-advanced-card-bundle-v15 | 02c7e410-b663-4cf0-89de-30087bbc1456 | 07509ac1-b113-4f5e-af69-8644573781b9 |
| aafnai-advanced-bead-inventory-v15 | 040a7bde-1294-4617-89a4-bcd0e8ed55a4 | 7eb09add-61c6-4a29-b197-6b20c3ff5325 |
| aafnai-advanced-chordpro-v15 | 3cc1ed86-f11d-40f6-b1cd-d0900f160b6d | f72e3c88-e075-4b5a-844a-fd6703d5103d |
| aafnai-advanced-font-language-v15 | fcad1fb8-eb13-4fb4-9fa7-2fd90f88b0e9 | 2b9e1617-c0b4-4e18-b054-66dcf22f7fe8 |
| aafnai-advanced-epub-diff-v15 | b4002c4d-9318-49fe-977b-1490608d4d20 | 9c8bc1f0-1fcf-41da-9893-b200c4eb7fec |
| aafnai-advanced-quiz-bank-v15 | 02af4a3f-513c-44ec-bfd5-e57d76e41127 | 5457172f-e691-40c1-af8a-d90ba21acac1 |
| aafnai-advanced-survey-branch-v15 | dd8e5221-8343-487e-950a-5a163eccb92e | 31f97983-309f-4f7a-a2f0-f3a954c63614 |
| aafnai-advanced-story-continuity-v15 | 0e777f76-0697-4606-a11e-d57d471ac3aa | 2f37086c-cb7c-4b82-95c2-6c3f3fb70060 |
| aafnai-advanced-rehearsal-planner-v15 | 6f728a3d-532f-469b-8217-72b05b17420e | 66548ed4-8d10-4dba-8064-653b67492489 |
| aafnai-advanced-qmk-simulator-v15 | a63f59e2-64d4-4dca-9404-ac08a5792851 | 1d517838-fb30-41b4-888a-9b4286e9bd45 |
| aafnai-advanced-pgn-diff-v15 | d3caf798-a72a-4603-b5f2-11b3f69ec0fe | 23f3c23d-a776-426d-b952-f754cdbec9ba |
| aafnai-advanced-exposure-sheet-v15 | 533ce632-c881-4fed-869f-96cc86360658 | 4423c81d-f578-4ceb-98cc-188a3b428ba5 |
| aafnai-advanced-coding-reconcile-v15 | ad73fede-8431-4a29-9c94-e05d3b5bebcf | b06bd15f-2377-4cef-9235-30fae650c535 |
| aafnai-advanced-icu-validator-v15 | 2da4b5ed-6929-4225-b99d-2c557fc74d49 | 18e66898-54e4-40bb-9880-38424561616d |
| aafnai-advanced-puzzle-hunt-v15 | b82df89f-9295-4dcc-9cf0-49cdaa9cc979 | e6d270d2-c815-465d-aefd-b1025351a422 |
| patro-day-atlas | 6023f463-45c0-4f3c-807b-d0252ae473df | 0bb3e18f-4fdb-4704-beb8-cb9d3572e6ae |

The 2,640-article library, the root Worker and the gateway have separate deployment entries and source snapshots. Their configuration and route/asset preservation requirements remain in README.md.

