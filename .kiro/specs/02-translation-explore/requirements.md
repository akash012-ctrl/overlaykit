# Requirements Document

Status: **draft.** The owner asked for all specs to be generated end to end, so this document was written without a review pause. Open questions OQ-1 to OQ-10 use their recommended defaults until the owner decides them. Generating this document is not owner approval (CAPABILITY-MAP.md §7).

## Introduction

This spec covers capability B in `docs/CAPABILITY-MAP.md` (§4.B): translating recognized text through a real provider, switching the target language, showing one state per label, and Explore, which explains the components of the verified machine TM-01 and shows only a translation everywhere else. It delivers gate G2 (AT-G2-01 to AT-G2-11) and gate G3 (AT-G3-01 to AT-G3-06 in `docs/QUALITY-GATES.md`), the QE-1, QE-2 and QE-3 checks for the `TR_*`, `MCH_*` and `CMP_NOT_VISIBLE` codes, and the device tests DT-G2-01 to DT-G2-06 and DT-G3-01 to DT-G3-05.

Translation sources, per language pair (D-027, D-028, D-030). **D-030: ML Kit on-device translation only for now. Item 2 is DEFERRED; its text is kept for later.**

1. On-device ML Kit translation, if the pair passes AT-G2-02 (the owner's own check, D-031) and the latency criterion.
2. DEFERRED (D-030): otherwise OpenRouter, on two routes with the same pinned model and safeguards: the team route through the `backend/` text-only proxy, and the user route, directly from the phone with the user's own OpenRouter key.
3. If no route is available, including a pair that fails AT-G2-02 while OpenRouter is deferred, the pair shows `TR_NOT_CONFIGURED`.

Until D-030 is reversed, the route table defaults each pair to `ml-kit` or `not-configured`. Gate tests use only `en`, `hi` and `kn`. Other ML Kit languages are evaluation extras and are not shipped or claimed (D-030, PRODUCT.md P3).

**D-031 (no reviewers).** No fluent reviewers are named. Every `hi` and `kn` string and TM-01 content value carries the status `unreviewed` and is never called reviewed. The README and demo state this.

**D-029 and D-032 (TM-01).** TM-01 is the iPad image fixture: a base panel image plus screen images, shown passively on an iPad, with AI-generated art and text added by us. Its ground truth is `test-fixtures/tm-01/FIXTURE.md` (sections 3 and 4). All boxes are DRAFT until measured from the final image.

Explore follows D-008 and D-010. On TM-01, tapping a located component shows its authored explanation. Anywhere else, a tap shows the label's translation and "Not a verified machine". The app never infers what an unverified component does.

Sources, in order of precedence: `docs/PRODUCT.md` (rules P1 to P8), `docs/DECISIONS.md` (D-xxx), `docs/ARCHITECTURE.md`, `docs/QUALITY-GATES.md`, `docs/DEVICE-TESTS.md`, `docs/CAPABILITY-MAP.md`, and the workspace steering files. Where these sources conflict, the conflict is listed under Open Questions with a recommended default.

**Library-neutral.** The ML Kit binding (or the local Kotlin module of D-005), the HTTP client, and the secure-storage library are chosen during this spec. No criterion names a vendor except where a decision already does (OpenRouter, D-028).

**Dependencies that need owner approval before they are added** (stack steering, "Adding a dependency"):

- `expo-secure-store`, for the user's OpenRouter key (D-028). Gate task: AT-G2-11.
- An ML Kit on-device translation binding for React Native, or a local Expo Module in Kotlin. Gate task: AT-G2-01. Compatibility with SDK 58, React Native 0.88 and the New Architecture must be checked and cited first.
- A property-test library (fast-check is the candidate), if spec A has not already added it.

No dependency is added by writing this document.

**Relationship to spec A.** Spec A (`camera-ocr-geometry`) ships the `TranslationProvider` interface, the Not-configured adapter and `t(key)` for its own screens if the owner accepts its OQ-1 and OQ-2. This spec extends those. If the owner rejects them, this spec adds them (CAPABILITY-MAP.md §7, "Pending allocation change"). Criteria below that say "extend" hold in both cases.

**Out of scope:** camera, OCR and image-to-view mapping (spec A), screens, workflows and Guide (spec C), speech playback (spec D), Settings sections for voice (spec D), release packaging (spec D), any machine other than TM-01, any second Explore fixture (Q8), analytics, login, and any image upload.

**Thresholds.** Numeric thresholds copied from QUALITY-GATES.md are *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Values the docs don't give are Named threshold constants with values set in G2 or G3 and recorded in `docs/DECISIONS.md`. This document invents no values for them.

**Device criteria.** A criterion tagged "Device" is verified only on the Reference phone, with a PASSED record in `docs/DEVICE-TESTS.md` that names the build commit, variant, device and date. Until that record exists, its status is "device validation pending". On the date of writing, no phone is connected, so every device criterion is pending. Performance criteria are measured on release builds.

## Glossary

- **OverlayKit_App**: the Expo Android app in this repository.
- **Camera_Screen**: the `ui` screen at the index route (spec A). It shows the preview, the shown still, mode switcher and Overlay_Layer.
- **Overlay_Layer**: the part of the Camera_Screen that draws Overlay items over the shown still (spec A).
- **Settings_Screen**: the `ui` screen rendered by the route `src/app/settings.tsx` (CM-3).
- **Privacy_Note**: the one-screen first-run notice about images and text (CM-5).
- **Test_Suite**: the Jest unit and property tests run by `npm test` (D-023).
- **Device_Tester**: the person who runs the `docs/DEVICE-TESTS.md` cases on the Reference phone.
- **Fluent_Reviewer**: a fluent speaker of Hindi or Kannada who rates translations and reviews strings and fixture text (owner Q5). None is named (D-031); until one is, content carries the status `unreviewed`.
- **Unreviewed**: the review status of every `hi` and `kn` string and fixture value authored by the team without a Fluent_Reviewer (D-031). It is a permitted state, never shown or described as reviewed.
- **Reference phone**: the Android phone named under owner question Q4 in `tasks/todo.md`.
- **locale module**: `src/modules/locale`. Owns `t(key)`, language settings, the TranslationProvider interface, its adapters, the translation cache, and the saved OpenRouter key.
- **components module**: `src/modules/components`. Owns the TM-01 fixture, machine identification, component location and explanations.
- **geometry module**: `src/modules/geometry`. Pure functions, including `matchLayout` and `hitTest`.
- **shared module**: `src/modules/shared`. Core types, `Result` and error codes.
- **ui module**: `src/modules/ui`. The only module that wires other modules together.
- **backend module**: the `backend/` package. A separate package, never imported by app code.
- **Proxy**: the HTTP service in the backend module that implements `POST /v1/translate` (ARCHITECTURE.md §9).
- **TranslationProvider**: the interface in the locale module behind which every translation engine sits.
- **Not-configured adapter**: the adapter that returns `TR_NOT_CONFIGURED` for every string (D-007).
- **On-device adapter**: the TranslationProvider adapter around ML Kit on-device translation.
- **Team-route adapter**: the adapter that sends text to the Proxy.
- **User-route adapter**: the adapter that sends text directly to OpenRouter with the user's saved key.
- **Language pair**: a source language and a target language, each one of `en`, `hi` or `kn`.
- **Route table**: the per-pair routing (on-device, cloud or not configured) fixed at G2 and recorded in `docs/DECISIONS.md` (D-027).
- **Target language**: the language the user chose to translate into, one of `en`, `hi` or `kn`.
- **Translation prompt**: the fixed instruction text sent to OpenRouter on both routes. It holds no recognized text.
- **Pinned model**: the one OpenRouter model ID recorded at G2 and used on both routes (D-028).
- **Output check**: the check that a model reply is valid JSON with exactly one translation per input string and that each translation's length is in proportion to its source (D-027).
- **Injection set**: the fixed set of injection strings kept in `test-fixtures/` (AT-G2-10).
- **OpenRouter key**: the API key a user saves in Settings (D-028). Not an OverlayKit account.
- **Key store**: the secure-storage entry holding the OpenRouter key.
- **Label state**: exactly one of translated, pending, failed or unsupported (QE-3).
- **Label**: one recognized line (an OcrLine) drawn with its Label state, as defined by spec A.
- **Unverified machine**: any machine whose MachineMatch status is `ambiguous` or `none`.
- **TM-01**: the verified ticket machine fixture (PRODUCT.md). It is the iPad image fixture of D-029: a first-party simulated machine made of a base panel image and screen images (D-032), with ground truth in `test-fixtures/tm-01/FIXTURE.md`.
- **MachineFixture**: the typed TM-01 data in the components module (ARCHITECTURE.md §10). In this spec it holds `id`, `version`, `verification`, `identification`, `components` and `review`. Screens and workflows are added by spec C (CM-1).
- **Anchor**: a fixed text on the TM-01 panel with a position in Machine space, used for identification.
- **Machine space**: positions relative to TM-01's anchors, normalized for distance, position and small rotation (ARCHITECTURE.md §7).
- **MachineMatch**: the result of `identifyMachine`: a status of `verified`, `ambiguous` or `none`, the frameId of the OcrResult it came from, and, for `verified`, the fit between Machine space and Image space.
- **Located component**: a fixture component whose region was mapped into the frame by `locateComponents`, with the frameId of its source.
- **Explanation**: the authored text for one component in `en`, `hi` and `kn`.
- **Fixture validator**: the pure function that checks a MachineFixture and is run by the Test_Suite.
- **Named threshold constant**: a numeric threshold defined once, in one source file, under a descriptive name, and covered by a test.
- **Recorded OCR snapshot**: a JSON file and its still photo from spec A, stored in `test-fixtures/`.
- **Negative set**: the physical items NEG-01 to NEG-10 in `docs/DEVICE-TESTS.md`.
- **Debug build / Release build**: the builds produced by build gates B1 and B2.

## Requirements

### Requirement 1: TranslationProvider interface and results

**User Story:** As a developer of screens and Explore, I want one typed translation interface that hides the engine, so that the app behaves the same whichever provider serves a language pair.

Source: P4, D-007, D-027, D-028, ARCHITECTURE.md §4 (`locale`), architecture steering (Provider adapters, Typed observations), QE-3.

#### Acceptance Criteria

1. THE locale module SHALL expose `translate(texts, { source, target })` that returns a Result holding either one outcome per input string or a `TR_*` error code for the whole call.
2. THE locale module SHALL return, for each input string, an outcome that is either a translated text with its detected source language, or one `TR_*` code.
3. THE locale module SHALL return the outcomes in the same order and the same count as the input strings.
4. THE locale module SHALL define the TranslationProvider interface so that on-device, team-route, user-route and not-configured adapters implement the same signature.
5. THE locale module SHALL convert vendor types to shared module types inside each adapter, so that no vendor type leaves the locale module.
6. THE locale module SHALL return every failure as a Result value and throw nothing across the module boundary.
7. WHEN the route table names no route for a Language pair, THE locale module SHALL return `TR_NOT_CONFIGURED` for every string of that pair (D-007).
8. THE locale module SHALL read each pair's route from one route table, so that routing is fixed per pair and never switches per request at runtime (D-027).
9. WHEN an adapter is replaced, THE locale module SHALL need changes only in that adapter and the route table.

Verification: unit tests for criteria 1 to 3, 6, 7 and 8 with fake adapters that exist only in test code. Type check and review for criterion 5.

### Requirement 2: Label states

**User Story:** As a user, I want every label to show exactly one clear state, so that I know whether I'm reading a real translation, a wait, a failure or an unreadable script.

Source: P4, QE-3, ARCHITECTURE.md §6 (Translate), product steering (Truthful capabilities), native-ux steering.

#### Acceptance Criteria

1. THE ui module SHALL give every Label exactly one Label state: translated, pending, failed or unsupported.
2. WHEN the ui module requests a Label's translation, THE ui module SHALL set that Label's state to pending until an outcome arrives.
3. WHEN an outcome for a Label is a translated text from a TranslationProvider adapter, THE ui module SHALL set that Label's state to translated and draw the translated text over the Label's Source position.
4. IF an outcome for a Label is a `TR_*` code, THEN THE ui module SHALL set that Label's state to failed, keep the recognized text visible, and show the marker text for that code from Requirement 9.
5. IF an OcrLine is marked `OCR_UNSUPPORTED_SCRIPT`, THEN THE ui module SHALL set its state to unsupported and send no translation request for it.
6. THE ui module SHALL set a Label's state to translated only from text returned by a TranslationProvider adapter.
7. THE ui module SHALL show each Label state as text, or as an icon with text.
8. WHEN an outcome arrives for a Label whose frameId is no longer shown, THE ui module SHALL discard the outcome.

Verification: unit tests for every criterion (QE-3), using Recorded OCR snapshots as input. Device: DT-G2-01 to DT-G2-03, device validation pending.

### Requirement 3: Translation provider evaluation and routing

**User Story:** As the owner, I want the provider chosen from measured results per language pair, so that each pair uses on-device translation only where it is good enough.

Source: D-007, D-027, D-028, AT-G2-01, AT-G2-02.

#### Acceptance Criteria

1. WHEN the G2 evaluation runs, THE evaluation SHALL use a test set of all TM-01 label strings plus 30 general sign and label strings (AT-G2-01).
2. WHEN the G2 evaluation runs, THE evaluation SHALL cover the pairs en→hi, en→kn, hi→en and hi→kn for the on-device candidate, and for OpenRouter on each pair where the on-device candidate fails (AT-G2-01).
3. WHEN the G2 evaluation runs, THE evaluation SHALL record in `docs/DECISIONS.md` a result for each D-007 criterion: quality, latency, offline capability, data-use terms, cost and quota, and integration effort (AT-G2-01).
4. WHEN the owner rates the test set, THE evaluation SHALL record the owner's own ratings for each pair, with the date and a statement of the limits of the check (not a fluent reviewer, small set), and SHALL claim no quality percentage (AT-G2-02, D-031).
5. IF the owner's check of the on-device candidate for a pair fails (AT-G2-02), THEN THE route table SHALL route that pair to `not-configured` while OpenRouter is deferred (D-030), and to OpenRouter once D-030 is reversed (D-027).
6. IF a pair fails the on-device latency criterion, THEN THE route table SHALL route that pair to `not-configured` while OpenRouter is deferred (D-030), and to OpenRouter once D-030 is reversed (D-007, D-027).
7. IF no candidate passes the owner's check for a Kannada pair, THEN THE project SHALL stop and ask the owner, and THE OverlayKit_App SHALL NOT hide or silently drop the pair (QUALITY-GATES.md G2 stop condition, PRODUCT.md P3, D-030).
8. DEFERRED (D-030): THE evaluation SHALL pin one OpenRouter model, record its ID in `docs/DECISIONS.md`, and rate that model on the test set before the model is used on either route (D-028).
9. THE route table SHALL be recorded in `docs/DECISIONS.md` with the evaluation results before any adapter other than the Not-configured adapter is enabled (D-027).
10. THE evaluation SHALL use only `en`, `hi` and `kn` in gate tests. Other ML Kit languages MAY be tried as evaluation extras and SHALL NOT be shipped or claimed (D-030).
11. THE evaluation SHALL treat any quality threshold from QUALITY-GATES.md as *(proposed; confirmed once after the G1 spike baseline)*, and SHALL NOT report the owner's own check as a quality percentage (D-031).

Verification: review of the `docs/DECISIONS.md` entry (AT-G2-01) and rating records (AT-G2-02). This criterion set is evaluation work, not app behaviour, and needs the Reference phone for on-device latency, so it is "device validation pending".

### Requirement 4: On-device translation adapter

**User Story:** As a user, I want translation on my phone where it works well, so that text stays on the device and the app works with little or no network.

Source: P4, P5, D-005, D-027, AT-G2-01, AT-G2-04, stack steering (dependencies, native code), OQ-2, OQ-9.

#### Acceptance Criteria

1. WHERE a Language pair is routed to on-device translation, THE locale module SHALL translate that pair's strings through the On-device adapter with no network request for the text.
2. WHERE a Language pair is routed to on-device translation, WHEN the pair's language model is not on the phone, THE On-device adapter SHALL report that the model is not downloaded, and THE ui module SHALL show a pending state with the text "Downloading language data" while the model downloads (OQ-9).
3. IF the language model download fails or the phone is offline during the download, THEN THE On-device adapter SHALL return the code chosen in OQ-9 and THE ui module SHALL show the failed Label state with its marker text.
4. THE On-device adapter SHALL keep ML Kit types inside the adapter and expose only shared module types.
5. THE locale module SHALL define the on-device translation timeout as a Named threshold constant, with its value set in G2 and recorded in `docs/DECISIONS.md`.
6. IF the On-device adapter does not return within the on-device translation timeout, THEN THE locale module SHALL return `TR_TIMEOUT` for that call.
7. THE OverlayKit_App SHALL add the ML Kit translation binding, or a local Expo Module that wraps ML Kit, only after the owner approves the dependency and the compatibility check in the stack steering is recorded.

Verification: unit tests with a fake on-device engine for criteria 2, 3 and 6. Device: model download and offline behaviour in DT-G2-02, device validation pending.

### Requirement 5: OpenRouter adapters and the shared translation protocol

**DEFERRED (D-030): ML Kit on-device only for now. The criteria below are kept unchanged for later and are not part of the current gate work.**

**User Story:** As a user whose language pair needs the cloud, I want translations through OpenRouter on either the team route or my own key, so that Translate works for judges and for me.

Source: P4, P5, D-027, D-028, ARCHITECTURE.md §9, AT-G2-07, AT-G2-09.

#### Acceptance Criteria

1. WHERE a Language pair is routed to the cloud and the user has saved an OpenRouter key, THE locale module SHALL use the User-route adapter for that pair (D-028).
2. WHERE a Language pair is routed to the cloud and the user has saved no OpenRouter key, THE locale module SHALL use the Team-route adapter for that pair (D-028).
3. WHERE a Language pair is routed to the cloud and no user key is saved and no Proxy URL is configured, THE locale module SHALL return `TR_NOT_CONFIGURED` for that pair (D-028).
4. THE User-route adapter and the Proxy SHALL use the same Pinned model, the same Translation prompt, the same Output check, and the same routing settings (D-028).
5. THE User-route adapter and the Proxy SHALL set `provider.data_collection` to `"deny"` and `provider.zdr` to `true` on every OpenRouter request (D-028).
6. THE User-route adapter and the Proxy SHALL set the model temperature to 0 and request JSON output with one translation per input string (D-028).
7. THE User-route adapter and the Proxy SHALL send recognized strings as data fields, with no recognized text inside the Translation prompt (D-027, threat T11).
8. THE User-route adapter and the Proxy SHALL run the Output check on every reply.
9. IF a reply fails the Output check, THEN THE locale module SHALL return `TR_PROVIDER_ERROR` for the strings of that call and show none of the reply.
10. THE locale module SHALL define the output length ratio of the Output check as a Named threshold constant, with its value set in G2 and recorded in `docs/DECISIONS.md` (D-027).
11. THE locale module SHALL send an OpenRouter request only over HTTPS.
12. THE locale module SHALL keep the Translation prompt, the Output check and the shared test cases in code that the `locale` module and the backend module each hold, with one shared set of test cases run against both (D-028).
13. THE locale module SHALL define the cloud translation timeout as a Named threshold constant, with its value set in G2 (ARCHITECTURE.md §8 proposes 5 s) and recorded in `docs/DECISIONS.md`.
14. IF a cloud request does not return within the cloud translation timeout, THEN THE locale module SHALL return `TR_TIMEOUT` for that call.

Verification: unit tests with a fake HTTP layer for criteria 1 to 9, 11 and 14. The same test cases run against the Proxy (Requirement 7). Device: DT-G2-05, device validation pending.

### Requirement 6: Instruction-injection safeguards

**User Story:** As a user at a machine, I want printed text to be translated and never obeyed, so that a sticker on the machine can't make the app tell me something false.

Source: D-027, D-028, ARCHITECTURE.md §11 (T8, T11), AT-G2-10, PRODUCT.md "Not built" (no LLM-generated explanations).

#### Acceptance Criteria

1. THE test-fixtures folder SHALL hold the Injection set as fixed strings, with expected outcomes recorded beside them.
2. WHEN each Injection set string is sent on the team route and on the user route, THE locale module SHALL return either a translation of that string or a `TR_*` code (AT-G2-10).
3. WHEN Fluent_Reviewers examine the outputs for the Injection set, THE evaluation SHALL find no output that adds text beyond a translation of its input (AT-G2-10).
4. THE ui module SHALL show a translation only as a Label, labelled as a translation, and never as a component explanation or a Guide step (T11).
5. THE ui module SHALL show recognized and translated text as plain text, never as a link, command or instruction (T8).
6. THE Translation prompt SHALL state that the strings are data to translate and not instructions, and that the reply is JSON only.
7. THE Injection set test SHALL run on a real OpenRouter call at G2, because a fake model proves nothing about obedience.

Verification: unit tests for criteria 1, 4 and 5. Criteria 2, 3 and 7 are G2 evaluation records in `docs/DECISIONS.md`.

### Requirement 7: Backend proxy contract

**DEFERRED (D-030): the backend proxy is not built for now. The criteria below are kept unchanged for later.**

**User Story:** As a judge without an OpenRouter key, I want Translate to work through a service run by the team, so that I can see translations without setup.

Source: P4, P5, D-013, D-027, D-028, ARCHITECTURE.md §9 and §11 (T3, T4, T5), AT-G2-07, AT-G2-08.

#### Acceptance Criteria

1. WHERE at least one Language pair is routed to the cloud, THE backend module SHALL provide the Proxy with the single endpoint `POST /v1/translate`.
2. THE Proxy SHALL accept a JSON body with `texts` (a list of strings), `source` (`auto`, `en` or `hi`) and `target` (`en`, `hi` or `kn`).
3. WHEN a valid request arrives, THE Proxy SHALL reply 200 with `translations` (one object per input string, each with `text` and `detectedSource`) and `provider`.
4. IF the body is invalid, THEN THE Proxy SHALL reply 400.
5. IF the body exceeds the size caps, THEN THE Proxy SHALL reply 413.
6. IF the request rate exceeds the per-IP rate limit or OpenRouter returns 429, THEN THE Proxy SHALL reply 429 and pass on `Retry-After` when OpenRouter gives it.
7. IF OpenRouter returns an error, a 200 with an `error` body, or a reply that fails the Output check, THEN THE Proxy SHALL reply 502.
8. THE Proxy SHALL map OpenRouter 401, 402 and 403 responses on the team key to 502, because the user can't fix the team key (D-028).
9. THE Proxy SHALL define the maximum strings per request and the maximum characters per request as Named threshold constants (ARCHITECTURE.md §9 proposes 50 strings and 5,000 characters), recorded in `docs/DECISIONS.md`.
10. THE Proxy SHALL serve only HTTPS.
11. THE Proxy SHALL keep the OpenRouter team key only in its environment, and SHALL NOT include it in any reply, log line or app bundle (T3).
12. THE Proxy SHALL store no request or translated text and write none to logs.
13. THE Proxy SHALL accept no image data and SHALL NOT require a login.
14. THE Proxy SHALL apply a per-IP rate limit, with its value recorded in `docs/DECISIONS.md` (T4).
15. THE backend module SHALL contain no UI and SHALL NOT be imported by app code.
16. WHEN the Team-route adapter calls the Proxy, THE locale module SHALL split input into requests within the Proxy's caps, so that the Proxy's 400 and 413 replies don't occur in normal use.
17. THE Team-route adapter SHALL map Proxy replies as follows: 429 to `TR_RATE_LIMITED`, 502 and any other 5xx or malformed reply to `TR_PROVIDER_ERROR`, 400 and 413 to `TR_PROVIDER_ERROR`, a timeout to `TR_TIMEOUT`, and no network to `TR_OFFLINE`.
18. IF the team's OpenRouter key has a credit limit that is spent, THEN THE Proxy SHALL reply 502 and THE Team-route adapter SHALL show `TR_PROVIDER_ERROR` (D-028).

Verification: backend tests with a fake OpenRouter for criteria 2 to 8, 12 and 13 using the shared test cases (Requirement 5, criterion 12). Source search of the bundle for key material (Q7, AT-G2-08) for criterion 11. Hosting is open (OQ-4), so the deployed Proxy is "device validation pending".

### Requirement 8: User OpenRouter key in Settings

**DEFERRED (D-030): the OpenRouter key section in Settings is not built for now. The criteria below are kept unchanged for later.**

**User Story:** As a user who wants to use my own OpenRouter account, I want to save my key safely and remove it, so that translations run on my billing and no one else sees my key.

Source: P7, D-028, ARCHITECTURE.md §8 (`TR_KEY_INVALID`, `TR_NO_CREDITS`) and §11 (T12), AT-G2-11, stack steering (new dependency), OQ-3, OQ-8.

#### Acceptance Criteria

1. THE Settings_Screen SHALL show an OpenRouter key section with a paste field, a Save button and, once a key is saved, a Remove button.
2. THE Settings_Screen SHALL show a plain note that recognized text goes to OpenRouter and the model provider it routes to, charged to the user's OpenRouter account.
3. WHEN the user taps Save, THE locale module SHALL check the key with `GET https://openrouter.ai/api/v1/key` before saving it.
4. IF OpenRouter rejects the key, THEN THE locale module SHALL NOT save the key, and THE Settings_Screen SHALL show that the key was not accepted.
5. IF the check cannot reach OpenRouter, THEN THE locale module SHALL NOT save the key, and THE Settings_Screen SHALL show the offline reason (OQ-8).
6. WHEN the OpenRouter check accepts the key, THE locale module SHALL save the key in the Key store only.
7. THE locale module SHALL store the key only in Android Keystore-backed secure storage, never in plain storage, the translation cache or the settings store.
8. WHILE a key is saved, THE Settings_Screen SHALL show the key masked, with at most its last four characters visible.
9. WHEN the user taps Remove, THE locale module SHALL delete the key from the Key store and THE Settings_Screen SHALL show that no key is saved.
10. THE locale module SHALL send the key only to `openrouter.ai`, only over HTTPS, and never to the Proxy.
11. THE locale module SHALL keep the key out of logs, crash output, exports, test fixtures, Recorded OCR snapshots and evidence screenshots.
12. IF OpenRouter returns 401 for a user-route request, THEN THE locale module SHALL return `TR_KEY_INVALID`.
13. IF OpenRouter returns 402, or 403 whose `error.metadata.limit_source` shows a spent budget, for a user-route request, THEN THE locale module SHALL return `TR_NO_CREDITS`.
14. WHILE a Label's outcome is `TR_KEY_INVALID`, THE ui module SHALL show the failed state with the text "Your OpenRouter key wasn't accepted".
15. WHILE a Label's outcome is `TR_NO_CREDITS`, THE ui module SHALL show the failed state with the text "Your OpenRouter key has no credit left".
16. THE locale module SHALL add the secure-storage library only after the owner approves it, with the SDK 58 and RN 0.88 compatibility check recorded (candidate: `expo-secure-store`).

Verification: unit tests with fake HTTP and a fake key store for criteria 3 to 9, 12 and 13 (QE-1). A source search for the key in logging calls (criterion 11). Device: DT-G2-03 with an invalid key and a key with no credit, device validation pending (AT-G2-11).

### Requirement 9: Translation error states

**User Story:** As a user, I want a short, honest reason when a translation can't be shown, so that I know whether to wait, retry or change a setting.

Source: ARCHITECTURE.md §8, D-028, AT-G2-04, QE-1, QE-2, QE-3, DT-G2-02, DT-G2-03, DT-ERR-02.

#### Acceptance Criteria

1. IF no route is available for a pair, THEN THE locale module SHALL return `TR_NOT_CONFIGURED`, and THE ui module SHALL show the recognized text with the marker "Translation not available" in the failed state.
2. IF a cloud route has no network, THEN THE locale module SHALL return `TR_OFFLINE`, and THE ui module SHALL show the recognized text with the marker "Offline" in the failed state.
3. WHEN the phone is online again after `TR_OFFLINE`, THE ui module SHALL request the translation again without a user action.
4. IF a translation request times out, THEN THE locale module SHALL return `TR_TIMEOUT`, and THE ui module SHALL show the recognized text with the marker "Timed out" and a retry control.
5. IF OpenRouter or the Proxy reports a rate limit, THEN THE locale module SHALL return `TR_RATE_LIMITED` and honour `Retry-After` when given, and THE ui module SHALL show "Busy, try again shortly".
6. IF a provider returns a 5xx status, a malformed reply, a reply that fails the Output check, or a problem with the team key, THEN THE locale module SHALL return `TR_PROVIDER_ERROR`, and THE ui module SHALL show the recognized text with the marker "Translation failed" and a retry control.
7. IF a provider can't translate the Language pair, THEN THE locale module SHALL return `TR_UNSUPPORTED_PAIR`, and THE ui module SHALL show the recognized text with the marker "Can't translate this language".
8. THE locale module SHALL map OpenRouter 408 to `TR_TIMEOUT`, 429 to `TR_RATE_LIMITED`, and 502, 503, any other 403 and a 200 with an `error` body to `TR_PROVIDER_ERROR` on the user route (D-028).
9. WHEN the user taps a retry control, THE ui module SHALL request that Label's translation again through the locale module.
10. THE ui module SHALL map each `TR_*` code to exactly one marker text and one Label state, with no code left unmapped.
11. THE locale module SHALL include, for each `TR_*` code, a code path that produces it, and THE ui module SHALL show the marker text of ARCHITECTURE.md §8 for it.
12. WHERE the build is a debug build, THE OverlayKit_App SHALL provide test hooks that force timeout, 429, 5xx and unsupported-pair outcomes, and THE release bundle SHALL exclude those hooks.

Verification: unit tests for every `TR_*` code (QE-1). Device: DT-G2-02 (offline), DT-G2-03 (hooks), DT-ERR-02, device validation pending (QE-2, AT-G2-04).

### Requirement 10: What is sent for translation

**User Story:** As a user, I want only the text that needs translating to leave my phone, so that images, unsupported text and text already in my language stay private.

Source: P5, D-006, AT-G2-05, AT-G2-07, ARCHITECTURE.md §11 (T1, T2, T9), DT-G2-04, DT-G2-05.

#### Acceptance Criteria

1. IF a line's source language equals the Target language, THEN THE ui module SHALL show the line as-is in the translated state's place and send no request for it (AT-G2-05).
2. THE ui module SHALL send no line marked `OCR_UNSUPPORTED_SCRIPT` for translation.
3. THE locale module SHALL send, on the team route, only the JSON body defined in Requirement 7 (AT-G2-07).
4. THE locale module SHALL send, on the user route, only the Translation prompt, the strings, the Pinned model and the routing settings, plus the user's key as an authorization header (AT-G2-07).
5. THE locale module SHALL send no image data on any route.
6. THE locale module SHALL enforce the size caps of Requirement 7, criterion 9 on both routes.
7. THE locale module SHALL NOT send a string made of a long digit sequence, with the length set as a Named threshold constant in G2 (T2, proposed in ARCHITECTURE.md).
8. THE locale module SHALL log no recognized text, translation or image data in release builds (T9).
9. THE locale module SHALL cache translations in memory only, keyed by source language, target language and text, and SHALL clear the cache when the app process ends.

Verification: unit tests for criteria 1, 2, 3, 4, 6, 7 and 9, and a source search for network calls carrying image types. Device: DT-G2-04 and DT-G2-05 with a network inspector in a debug build, device validation pending.

### Requirement 11: No glossary and no canned translations

**User Story:** As a judge, I want proof that arbitrary text is translated by a real provider, so that I can trust that Translate is not a demo.

Source: P4, D-007, D-008, AT-G2-06, product steering (Truthful capabilities).

#### Acceptance Criteria

1. THE locale module SHALL hold no translation table, glossary or canned translation for recognized text.
2. WHEN a string that appears in no fixture is translated, THE locale module SHALL return either the provider's translation or a `TR_*` code, and never a stored result (AT-G2-06).
3. THE components module SHALL NOT be used to translate recognized text, and THE locale module SHALL NOT read the MachineFixture (D-008).
4. WHERE a fixed translation exists in the app, THE OverlayKit_App SHALL limit it to UI strings and authored fixture content.

Verification: a unit test that sends a random string, absent from every fixture, through a fake provider and checks that the result comes from the provider; code review and source search for translation tables (AT-G2-06).

### Requirement 12: Translation latency and batching

**User Story:** As a user, I want translations to appear soon after the labels do, so that I can read them while I'm still looking at the machine.

Source: AT-G2-09, DT-G2-06, D-007 (latency criterion).

#### Acceptance Criteria

1. WHEN the ui module has the lines of one frame to translate, THE ui module SHALL send them to the locale module in one `translate` call per Language pair.
2. WHEN the locale module translates one frame's labels on Wi-Fi (cloud route) or on the phone (on-device route), THE locale module SHALL return the outcomes within 2 s at p50 (AT-G2-09, proposed).
3. WHEN a string is already in the translation cache, THE locale module SHALL return its cached translation without a provider call.

Verification: unit test for criteria 1 and 3. Device: DT-G2-06 on a release build over 10 runs, device validation pending.

### Requirement 13: Target-language switching

**User Story:** As a user, I want to choose the language I translate into and have the app remember it, so that I don't set it again each time.

Source: P3, PRODUCT.md S1 step 2, CAPABILITY-MAP.md §4.B, DT-G2-01, DT-G2-04, OQ-1.

#### Acceptance Criteria

1. THE Settings_Screen SHALL offer the Target language choice of English, Hindi and Kannada, each shown in its own script.
2. WHEN the user selects a Target language, THE locale module SHALL save the choice in the settings store on the phone.
3. WHEN the OverlayKit_App starts, THE locale module SHALL load the saved Target language.
4. WHILE no choice is saved, THE locale module SHALL use the default Target language decided in OQ-1.
5. WHEN the Target language changes while a still is shown, THE ui module SHALL request translations again for that still's Labels in the new Target language.
6. THE locale module SHALL keep the settings store as the only persistent app state, holding no OpenRouter key and no image data.
7. THE locale module SHALL provide `useLocaleSettings()` that returns the Target language and the UI language.

Verification: unit tests for criteria 2 to 6 with a fake settings store. Device: DT-G2-01 and DT-G2-04, device validation pending.

### Requirement 14: UI strings in en, hi and kn

**User Story:** As a user who reads Hindi or Kannada, I want the app's own text in my language, with a clear note that it is not yet reviewed by a fluent speaker, so that I can use it without reading English and know its limits.

Source: P3, native-ux steering (Localization), CAPABILITY-MAP.md §4.B, ARCHITECTURE.md §4 (`locale`), owner Q5, OQ-1.

#### Acceptance Criteria

1. THE ui module SHALL obtain every user-facing string through the locale module's `t(key)`.
2. THE locale module SHALL hold an `en`, `hi` and `kn` value for every string key (spec A's keys and this spec's keys).
3. THE locale module SHALL record, for each `hi` and `kn` string value, a review status that is either `unreviewed` or a Fluent_Reviewer with review date, and SHALL record `unreviewed` for every value while no reviewer exists (D-031).
4. IF any `hi` or `kn` string value has no review status, or has status `reviewed` without a recorded Fluent_Reviewer and date, THEN THE Test_Suite SHALL fail.
5. THE locale module SHALL store each user-facing sentence under one key with placeholders for inserted values.
6. WHEN the UI language is `hi` or `kn`, THE Settings_Screen and Camera_Screen SHALL show Devanagari and Kannada text in the correct script, with no missing-glyph boxes and with marks above and below the line fully visible (AT-G2-03).
7. WHEN the UI language is `hi` or `kn`, THE ui module SHALL lay out each screen at the largest Android system font size without clipping controls or text.
8. IF a key is missing for the selected UI language at runtime, THEN THE locale module SHALL return the `en` value.
9. THE README and the demo script SHALL state that the `hi` and `kn` text is `unreviewed` and has not been checked by a fluent speaker (D-031).

Verification: unit tests for criteria 2, 4, 5 and 8. Device: DT-G2-01 for criterion 6 on both scripts, device validation pending. Review status records in the string table. Criterion 9 is checked by review of the README and demo script.

### Requirement 15: First-run privacy note

**User Story:** As a first-time user, I want to know what leaves my phone before any text is sent, so that I can decide whether to use Translate.

Source: P5, D-028, CAPABILITY-MAP.md §4.B and CM-5, PRODUCT.md S1 step 1, ARCHITECTURE.md §11 (T2).

#### Acceptance Criteria

1. WHEN the OverlayKit_App starts for the first time, THE ui module SHALL show the Privacy_Note before it sends any text for translation.
2. THE Privacy_Note SHALL say that images stay on the phone and that recognized text may be sent for translation.
3. WHERE a cloud route is configured, THE Privacy_Note SHALL name OpenRouter and the model provider it routes to as the recipients of the text.
4. WHERE every pair is on-device, THE Privacy_Note SHALL say that text stays on the phone.
5. WHEN the user acknowledges the Privacy_Note, THE locale module SHALL save the acknowledgement in the settings store.
6. WHILE the Privacy_Note is not acknowledged, THE ui module SHALL send no text for translation and show each Label in the failed state with the marker "Translation not available".
7. THE Settings_Screen SHALL offer a way to read the Privacy_Note again.
8. THE Privacy_Note SHALL be a string set in `en`, `hi` and `kn`, with review statuses under Requirement 14.

Verification: unit tests for criteria 1, 5 and 6. Device: first launch on a fresh install, device validation pending.

### Requirement 16: Settings route

**User Story:** As a user, I want one place for the language, my OpenRouter key and the privacy note, so that I can change them without hunting through the app.

Source: CAPABILITY-MAP.md §4.B and CM-3, architecture steering (routes stay thin), native-ux steering.

#### Acceptance Criteria

1. THE OverlayKit_App SHALL provide the route `src/app/settings.tsx`.
2. THE route SHALL render the ui module's Settings_Screen and hold no other logic.
3. THE Settings_Screen SHALL hold a language section (Requirement 13), an OpenRouter key section (Requirement 8) and a link to the Privacy_Note (Requirement 15).
4. THE Camera_Screen SHALL offer a control that opens the Settings_Screen.
5. WHEN the user presses the Android back button on the Settings_Screen, THE OverlayKit_App SHALL return to the Camera_Screen.
6. THE Settings_Screen SHALL NOT include voice settings, which spec D adds.
7. THE Settings_Screen SHALL give every touchable element a touch target of at least 48 × 48 dp, an accessibilityRole and an accessibilityLabel in the UI language.

Verification: unit tests for criteria 3, 4 and 7. Review and source search for criterion 2.

### Requirement 17: TM-01 fixture data and validation

**User Story:** As a developer, I want TM-01's identification and component data as typed, validated content, so that wrong or half-finished fixture content can't ship.

Source: D-008, D-017, D-029, D-031, D-032, ARCHITECTURE.md §10, PRODUCT.md (verified machine, items 1 to 4), AT-G3-05, CM-1, `test-fixtures/tm-01/FIXTURE.md`.

#### Acceptance Criteria

1. THE components module SHALL hold the MachineFixture for TM-01 as typed data bundled with the app, with no remote loading (D-017).
2. THE MachineFixture SHALL list the panel's anchors with their Machine-space positions, `minAnchors` and `minScore`.
3. THE MachineFixture SHALL list each component with its id, kind, Machine-space region and an Explanation in `en`, `hi` and `kn`.
4. THE MachineFixture SHALL record its verification: who verified it, the date, the method (`on-site` or `replica`) and the evidence.
5. THE MachineFixture SHALL record, for `hi` and `kn`, a review field that is either `unreviewed` or a Fluent_Reviewer with review date, and SHALL hold `unreviewed` while no reviewer exists (D-031).
6. THE Fixture validator SHALL reject a MachineFixture that has fewer anchors than `minAnchors`, a component without a locale in its Explanation, a missing review field, a review field that names a reviewer with an empty reviewer or date, a component region that is not a finite quad of positive area, or a duplicate component id.
7. IF the Fixture validator rejects the MachineFixture, THEN THE Test_Suite SHALL fail and THE components module SHALL report every machine as `none`.
8. THE Test_Suite SHALL run the Fixture validator on the bundled MachineFixture.
9. THE components module SHALL leave the MachineFixture's `screens` and `workflows` fields to spec C (CM-1).
10. THE OverlayKit_App SHALL describe TM-01 as a first-party simulated machine in the Settings_Screen's honest-limits text (product steering, D-029).
11. THE components module SHALL hold no content for any machine other than TM-01.
12. THE MachineFixture SHALL carry no step text, because step text is authored in spec C.
13. THE MachineFixture SHALL take its anchors (L01 to L09), components (C-SCREEN, C-CARD, C-COIN, C-NOTE, C-CANCEL, C-CONFIRM, C-HELP, C-TRAY) and ground-truth strings from sections 3 and 4 of `test-fixtures/tm-01/FIXTURE.md` (D-029, D-032).
14. WHILE a box or region in the MachineFixture is marked DRAFT in `test-fixtures/tm-01/FIXTURE.md`, THE Test_Suite SHALL NOT rely on that box or region for a recognition assertion, and THE MachineFixture SHALL carry the DRAFT mark until the value is measured from the final image.

Verification: Fixture validator unit tests with a valid fixture and one invalid fixture per rejection rule (QE-1 for `MCH_*`), including a fixture with an `unreviewed` review field that passes. The fixture's content waits for the final TM-01 images (D-029, D-032). With no reviewers (D-031), AT-G3-05 is the owner's own check with its limits stated, and `hi` and `kn` content is disclosed as `unreviewed` in the README and demo.

### Requirement 18: Machine identification

**User Story:** As a user, I want the app to recognize TM-01 only when it is sure, so that I never get a verified explanation for the wrong machine.

Source: D-009, D-010, ARCHITECTURE.md §6 (Explore) and §8 (`MCH_NOT_VERIFIED`, `MCH_AMBIGUOUS`) and §11 (T7, T8), AT-G3-01, AT-G3-02, AT-G3-03, DT-G3-01 to DT-G3-03.

#### Acceptance Criteria

1. WHEN the ui module passes an OcrResult to `identifyMachine`, THE components module SHALL return a MachineMatch with the status `verified`, `ambiguous` or `none` and the OcrResult's frameId.
2. THE components module SHALL derive the status from the layout of several Anchors matched by `matchLayout`, never from a single text.
3. IF the number of matched Anchors is at least `minAnchors` and the layout score is at least `minScore`, THEN THE components module SHALL return `verified`.
4. IF at least one Anchor matches but the conditions of criterion 3 are not met, THEN THE components module SHALL return `ambiguous` and the code `MCH_AMBIGUOUS`.
5. IF no Anchor matches, or the Fixture validator rejects the fixture, THEN THE components module SHALL return `none` and the code `MCH_NOT_VERIFIED`.
6. THE components module SHALL treat `ambiguous` and `none` as an Unverified machine in every behaviour of Explore.
7. THE components module SHALL define `minAnchors` and `minScore` as Named threshold constants, set from the G3 measurements and recorded in `docs/DECISIONS.md` before the G3 device measurements start.
8. THE components module SHALL match Anchor text after case and whitespace normalization, using only lines whose Script is Latin or Devanagari.
9. IF the match used an OcrResult flagged `OCR_LOW_QUALITY`, THEN THE components module SHALL NOT return `verified`.
10. WHEN the Anchors match across the whole negative set, THE components module SHALL return `verified` for none of them (AT-G3-02).
11. WHEN a different OcrResult with an unchanged panel arrives, THE components module SHALL return the same status for the same input (deterministic).
12. THE components module SHALL make no network request and use no translation.

Verification: unit tests on Recorded OCR snapshots (TM-01 at the distances and angles, partial views, and negative-set items) once they exist, plus property tests that a random subset of fewer than `minAnchors` Anchors never yields `verified`. Device: DT-G3-01, DT-G3-02, DT-G3-03, device validation pending. AT-G3-02 is a hard requirement.

### Requirement 19: Machine-layout matching

**User Story:** As a developer, I want a pure layout-matching function, so that identification and component location tolerate distance, position and small rotation.

Source: ARCHITECTURE.md §4 (`matchLayout`) and §7 (Machine space), architecture steering (only `geometry` converts spaces), quality steering (property tests), AT-G3-01, AT-G3-04.

#### Acceptance Criteria

1. THE geometry module SHALL provide `matchLayout(observed, template)` that returns a fit between Machine space and Image space, a score and the matched Anchors.
2. THE geometry module SHALL make the fit tolerate uniform scale, translation and small rotation of the panel in the frame.
3. THE geometry module SHALL return a score that does not change when the observed points are scaled, translated or rotated by a small angle (invariance property).
4. IF the observed points hold a non-finite coordinate, THEN THE geometry module SHALL ignore that point and return a finite score.
5. IF fewer than the template's minimum number of points match, THEN THE geometry module SHALL return no fit.
6. THE geometry module SHALL import only the shared module, with no React Native imports and no I/O.
7. THE geometry module SHALL define the rotation tolerance as a Named threshold constant, set in G3 and recorded in `docs/DECISIONS.md`.

Verification: property tests over random scale, translation and small rotation (quality steering), plus unit tests on Recorded OCR snapshots of TM-01.

### Requirement 20: Component location

**User Story:** As a user, I want each TM-01 component found on screen, so that I can tap it and so that Guide can highlight it later.

Source: ARCHITECTURE.md §4 (`locateComponents`) and §8 (`CMP_NOT_VISIBLE`), AT-G3-04, DT-G3-04, CAPABILITY-MAP.md §4.B.

#### Acceptance Criteria

1. WHEN the ui module passes a `verified` MachineMatch and its OcrResult to `locateComponents`, THE components module SHALL return a list of Located components, each with the OcrResult's frameId.
2. THE components module SHALL map each component's Machine-space region into Image space through the MachineMatch's fit, and the geometry module SHALL map that region into View space.
3. IF a component's mapped region lies entirely outside the frame, THEN THE components module SHALL omit that component and report `CMP_NOT_VISIBLE` for it.
4. IF the MachineMatch is not `verified`, THEN THE components module SHALL return no Located components.
5. THE components module SHALL locate at least 90% of TM-01's components that are in the frame (AT-G3-04, proposed).
6. WHILE a requested component is not located, THE ui module SHALL show "Point the camera at the [component]" with the component's name in the UI language.
7. THE ui module SHALL draw no highlight for a component that is not located.
8. THE components module SHALL return finite coordinates only, and omit any component whose mapped region is non-finite.

Verification: unit tests for criteria 1 to 4 and 8 on Recorded OCR snapshots, and the `CMP_NOT_VISIBLE` mapping (QE-1). Device: DT-G3-04 and DT-ERR-04, device validation pending (QE-2).

### Requirement 21: Hit testing

**User Story:** As a user, I want a tap to select the component or label I touched, so that the app answers about the right thing.

Source: ARCHITECTURE.md §4 (`hitTest`) and §6 (Explore), AT-G3-04, DT-G3-04, native-ux steering (touch targets).

#### Acceptance Criteria

1. THE geometry module SHALL provide `hitTest(point, items)` that returns the item under the tap point, or none.
2. IF a point lies inside both a Located component's region and a Label's Source outline, THEN THE geometry module SHALL return the item chosen by the rule decided in OQ-7.
3. IF a tap point lies within the touch margin of an item and no item contains it, THEN THE geometry module SHALL return the nearest item within that margin.
4. THE geometry module SHALL define the touch margin as a Named threshold constant that gives each item a touch target of at least 48 × 48 dp.
5. IF the tap point is non-finite, THEN THE geometry module SHALL return none.
6. WHEN two items are equally near, THE geometry module SHALL return the same one for the same input (deterministic).
7. THE geometry module SHALL perform no I/O and import no React Native modules.
8. THE Overlay_Layer SHALL hit-test taps against the Overlay items of the shown frame only.
9. THE geometry module SHALL hit-test in View space, using positions already mapped by the geometry module, and THE ui module SHALL contain no coordinate math.

Verification: property tests that the returned item contains or is nearest to the point, and that non-finite input returns none; unit tests on Recorded OCR snapshots. Taps hit the right component in at least 95% of attempts (AT-G3-04, proposed). Device: DT-G3-04, device validation pending.

### Requirement 22: Explore on a verified machine

**User Story:** As a Kannada reader at TM-01, I want to tap a component and read what it does in my language, so that I can use the machine with confidence.

Source: P1, P6, D-008, D-010, PRODUCT.md (Explore mode), AT-G3-04, AT-G3-05, DT-G3-04, OQ-1, OQ-7.

#### Acceptance Criteria

1. WHILE the current MachineMatch is `verified`, WHEN the user taps a Located component, THE ui module SHALL show that component's Explanation from `components.explain(componentId, locale)` in the UI language (OQ-1).
2. THE components module SHALL return Explanation text only from the MachineFixture, with no generation, inference or runtime translation (D-008).
3. IF the requested locale has no Explanation, THEN THE components module SHALL return an error, and THE ui module SHALL show the failed state, with no text from another source.
4. THE ui module SHALL show the Explanation labelled as an authored explanation of TM-01.
5. THE ui module SHALL show the tapped component's name and Explanation within one tap, with no further navigation.
6. THE Explore mode SHALL be added to the mode switcher only when this spec delivers it (CM-4).
7. WHEN the OverlayKit_App shows an Explanation, THE ui module SHALL show it for a MachineMatch whose frameId matches the shown still, and SHALL discard it when a newer still replaces the shown one.

Verification: unit tests for criteria 1 to 3 and 7. Device: DT-G3-04 with target `kn`, device validation pending.

### Requirement 23: Explore on an unverified machine

**User Story:** As a user at any other machine, I want a tap to give me the label's translation and an honest note, so that I'm never told what a control does when the app doesn't know.

Source: P1, P6, D-009, D-010, PRODUCT.md (Explore mode, S1-N), AT-G3-06, DT-G3-05, ARCHITECTURE.md §8 (`MCH_NOT_VERIFIED`, `MCH_AMBIGUOUS`).

#### Acceptance Criteria

1. WHILE the current MachineMatch is `ambiguous` or `none`, WHEN the user taps a Label, THE ui module SHALL show that Label's translation and the note "Not a verified machine".
2. WHILE the current MachineMatch is `ambiguous` or `none`, THE ui module SHALL show no component name, function, classification or guess for the tapped item (D-010).
3. WHILE the current MachineMatch is `ambiguous`, THE ui module SHALL show the same behaviour as for `none`, and MAY add the hint "Move to show more of the panel".
4. IF the tapped Label's translation is pending, THEN THE ui module SHALL show the pending state with the note "Not a verified machine".
5. IF the tapped Label's translation failed, THEN THE ui module SHALL show the failed state, the recognized text and the note "Not a verified machine".
6. WHILE the current MachineMatch is `verified` and a tap hits a Label that is not a Located component, THE ui module SHALL show that Label's translation and no component claim (OQ-7).
7. THE ui module SHALL NOT use TM-01 fixture content to describe, name or translate any item on an Unverified machine.
8. THE note "Not a verified machine" SHALL be a string set in `en`, `hi` and `kn`, reviewed under Requirement 14.

Verification: unit tests for criteria 1 to 7 using the negative-set Recorded OCR snapshots (QE-1 for `MCH_NOT_VERIFIED` and `MCH_AMBIGUOUS`). Device: DT-G3-05 and DT-G3-02, device validation pending.

### Requirement 24: Machine and component error states

**User Story:** As a user, I want a clear message when the machine isn't recognized or a component isn't in view, so that I know how to move the phone.

Source: ARCHITECTURE.md §8 (`MCH_NOT_VERIFIED`, `MCH_AMBIGUOUS`, `CMP_NOT_VISIBLE`), QE-1, QE-2, CAPABILITY-MAP.md §5, DT-ERR-04.

#### Acceptance Criteria

1. THE components module SHALL produce `MCH_NOT_VERIFIED`, `MCH_AMBIGUOUS` and `CMP_NOT_VISIBLE`, and no other module SHALL produce them.
2. THE ui module SHALL map `MCH_NOT_VERIFIED` and `MCH_AMBIGUOUS` to the Explore behaviour of Requirement 23, and to the Guide refusal that spec C owns.
3. THE ui module SHALL map `CMP_NOT_VISIBLE` to the prompt "Point the camera at the [component]" (Requirement 20).
4. THE Test_Suite SHALL include, for each of the three codes, a unit test that the components module produces it and a unit test that the ui module maps it to its ARCHITECTURE.md §8 state (QE-1).
5. WHEN G3 device testing runs, THE Device_Tester SHALL reach each of the three states at least once on the Reference phone (QE-2).

Verification: `npm test` and device records, device validation pending.

### Requirement 25: Rendering and accessibility of translated text

**User Story:** As a user, I want translated labels I can read and reach, including with a screen reader, so that I can use the app in a public place.

Source: native-ux steering (Readable overlays, Accessibility, Localization), AT-G2-03, DT-G2-01.

#### Acceptance Criteria

1. THE Overlay_Layer SHALL draw translated text with a text-to-backing contrast ratio of at least 4.5:1 and a size of at least 14 sp.
2. WHEN the Target language is `hi` or `kn`, THE Overlay_Layer SHALL show translated text in the correct script, with no missing-glyph boxes and the marks above and below the line fully visible (AT-G2-03).
3. THE Overlay_Layer SHALL show the Label state of Requirement 2 as text, or as an icon with text.
4. THE ui module SHALL expose each tappable Label's text and state, and each Explanation, to Android accessibility services.
5. THE ui module SHALL give every new touchable element a touch target of at least 48 × 48 dp, an accessibilityRole and an accessibilityLabel in the UI language.
6. IF translated text doesn't fit its Label box, THEN THE Overlay_Layer SHALL truncate it with an ellipsis, and WHEN the user taps it, THE ui module SHALL show the full text.

Verification: unit tests for criteria 1, 3, 5 and 6 on style constants and accessibility props. Device: DT-G2-01 for criterion 2 with screenshots, device validation pending.

### Requirement 26: Module boundaries and error contract

**User Story:** As a developer of specs C and D, I want translation, identification and hit-testing behind typed one-way boundaries, so that later specs use their results without depending on vendors or hidden coupling.

Source: D-012, ARCHITECTURE.md §4, §5 and §8, architecture steering, QUALITY-GATES.md Q4, CAPABILITY-MAP.md §1 (rule 5) and §4.B.

#### Acceptance Criteria

1. THE shared module SHALL define the `TR_*`, `MCH_*` and `CMP_NOT_VISIBLE` codes listed in ARCHITECTURE.md §8, and the types for translation outcomes and MachineMatch.
2. THE locale module SHALL return every failure as a Result error with a `TR_*` code, and SHALL import only the shared module.
3. THE components module SHALL return every failure as a Result error with an `MCH_*` or `CMP_NOT_VISIBLE` code, and SHALL import only the geometry module and the shared module.
4. THE geometry module SHALL be the only module that converts image or machine coordinates to View-space coordinates.
5. THE ui module SHALL be the only module that wires the locale, components, geometry, ocr and capture modules together.
6. THE ui module SHALL hold no rule that decides whether a machine is verified.
7. THE locale module SHALL NOT import the components module, and THE components module SHALL NOT import the locale module.
8. THE locale module, components module, geometry module and ui module SHALL import other modules only through each module's `index.ts`, as checked by static gate Q4.
9. THE app code SHALL NOT import the backend module.
10. THE ui module SHALL map every `TR_*`, `MCH_*` and `CMP_NOT_VISIBLE` code to the state given in ARCHITECTURE.md §8.
11. THE OverlayKit_App SHALL add no state-management library; it SHALL use React state, hooks, and one small settings store in the locale module.

Verification: `npm run typecheck`, `npm run lint` with the boundary rule (Q4, once added), and the QE-1 tests in Requirement 27.

### Requirement 27: Tests and evidence

**User Story:** As the owner, I want translation, identification and hit-testing covered by tests on recorded data, so that a passing gate reflects checked behaviour.

Source: quality steering (Tests, Never, Real-device gate), QUALITY-GATES.md (QE-1, QE-2, QE-3, Q5, Q7, Q8), ARCHITECTURE.md §12.

#### Acceptance Criteria

1. THE Test_Suite SHALL give each pure function in `geometry` (`matchLayout`, `hitTest`), `components` (`identifyMachine`, `locateComponents`, `explain`, the Fixture validator) and `locale` (error mapping, Output check, size caps, route table) at least one unit test.
2. THE Test_Suite SHALL use Recorded OCR snapshots from the test-fixtures folder as the input for every test that needs OCR output, and SHALL NOT use invented OCR output.
3. IF a test needs a case that recorded captures can't produce, THEN THE Test_Suite SHALL derive that case from a Recorded OCR snapshot by changing named fields, and state the changed fields in the test.
4. THE Test_Suite SHALL include property tests for `matchLayout` (invariance) and `hitTest` (containment or nearest, finite output).
5. THE Test_Suite SHALL include, for each `TR_*`, `MCH_*` and `CMP_NOT_VISIBLE` code, a unit test that the owning module produces it and a unit test that the ui module maps it to its state (QE-1).
6. THE Test_Suite SHALL include, for each Named threshold constant, a unit test that checks behaviour on both sides of the threshold.
7. THE Test_Suite SHALL include a fake-provider test that the same Injection set and the same Output check cases run against the locale module and the backend module.
8. THE Test_Suite SHALL NOT delete, skip, weaken or re-snapshot any test to pass.
9. THE static gates SHALL show that the app bundle holds no OpenRouter team key (Q7, AT-G2-08) and that no web or auth package is present (Q8).
10. WHEN G2 and G3 device testing runs, THE Device_Tester SHALL reach each user-visible `TR_*`, `MCH_*` and `CMP_NOT_VISIBLE` state at least once on the Reference phone, through the DT-G2, DT-G3 and DT-ERR tests (QE-2).

Verification: `npm test` output with pass and fail counts; device records in `docs/DEVICE-TESTS.md`. Criteria 4 needs the property-test library (see Dependencies).

### Requirement 28: G2 and G3 device acceptance

**User Story:** As the owner, I want G2 and G3 judged on measurements on the Reference phone, so that the gates reflect what a user sees at the machine.

Source: QUALITY-GATES.md G2 and G3, DEVICE-TESTS.md (DT-G2-01 to DT-G2-06, DT-G3-01 to DT-G3-05, DT-ERR-02, DT-ERR-04), QE-2, OQ-6.

Every threshold in this requirement is *(proposed; confirmed once after the G1 spike baseline; any change needs a DECISIONS.md entry)*. Every criterion is device-only and is "device validation pending". A "Pass" in this section means a PASSED record in `docs/DEVICE-TESTS.md`.

D-030 defers the cloud route. Criteria 4 and 13 (OpenRouter key) are DEFERRED. In criteria 2, 3, 5, 6 and 7, "cloud provider" and "both routes" read as "the on-device route" until D-030 is reversed. Device runs use TM-01 as the iPad image fixture (D-029).

#### Acceptance Criteria

1. WHEN DT-G2-01 runs (target `hi`, then `kn`, translating TM-01), THE OverlayKit_App SHALL show translated text in the correct script with no missing-glyph boxes (AT-G2-03).
2. WHEN DT-G2-02 runs (airplane mode, cloud provider, translating TM-01), THE OverlayKit_App SHALL show the original text with the "Offline" marker (AT-G2-04).
3. WHEN DT-G2-03 runs (debug build with test hooks forcing timeout, 429, 5xx and unsupported pair), THE OverlayKit_App SHALL show the matching `TR_*` state for each (AT-G2-04).
4. WHEN DT-G2-03 runs with an invalid key and a key with no credit, THE OverlayKit_App SHALL show `TR_KEY_INVALID` and `TR_NO_CREDITS` (AT-G2-11).
5. WHEN DT-G2-04 runs (target `en`, translating CARD-EN), THE OverlayKit_App SHALL send no translation request and show the text as-is (AT-G2-05).
6. WHEN DT-G2-05 runs (debug build with a network inspector, translating TM-01), THE OverlayKit_App SHALL send request bodies holding text only and no image data, on both routes (AT-G2-07).
7. WHEN DT-G2-06 runs on a release build over Wi-Fi, 10 translations of TM-01, THE locale module SHALL return outcomes within 2 s at p50 (AT-G2-09).
8. WHEN DT-G3-01 runs (TM-01 at D30, D60, D100 and A0, A30, 20 attempts), THE components module SHALL return `verified` in at least 95% of attempts (AT-G3-01).
9. WHEN DT-G3-02 runs (NEG-01 to NEG-10, 3 attempts each), THE components module SHALL return `verified` for none of them (AT-G3-02, hard requirement).
10. WHEN DT-G3-03 runs (TM-01 partly out of frame, fewer than `minAnchors` Anchors in view), THE components module SHALL return `ambiguous`, treated as unverified (AT-G3-03).
11. WHEN DT-G3-04 runs (TM-01, target `kn`, each component tapped), THE components module SHALL locate at least 90% of components in frame, taps SHALL select the right component in at least 95% of attempts, and the Explanation SHALL appear in Kannada (AT-G3-04, AT-G3-05).
12. WHEN DT-G3-05 runs (NEG-01, a label tapped), THE ui module SHALL show the translation and "Not a verified machine" and no component claim (AT-G3-06).
13. WHEN the user saves an OpenRouter key on the Reference phone, THE OverlayKit_App SHALL keep it masked, store it only in secure storage, and send it only to `openrouter.ai` (AT-G2-11).

Verification: PASSED records per criterion in `docs/DEVICE-TESTS.md` with build commit, variant, device and date. QUALITY-GATES.md stop conditions apply: if AT-G3-02 fails, raise the match thresholds; if true matches then fall below 80%, stop and ask the owner. With no Fluent_Reviewers (D-031), the G3 stop condition "No reviewers" no longer applies: `hi` and `kn` content is `unreviewed`, disclosed in the README and demo (Requirement 14, criterion 9).

## Open Questions

Each item below is **pending owner decision**. The criteria use the recommended default until the owner decides.

### OQ-1: UI language and target language

- **Conflict:** PRODUCT.md says the UI is available in `en`, `hi` and `kn` and that Translate has a target language. It doesn't say whether these are one setting or two (CAPABILITY-MAP.md §4.B, "Open inside B"). Explore says explanations appear "in the user's language".
- **Sources:** PRODUCT.md (Language support, S1 step 2), CAPABILITY-MAP.md §4.B.
- **Recommended default:** one setting. The Target language is also the UI language and the language of Explanations. The default before a choice is saved is `en`. A separate UI-language setting can be added later with a decision entry.
- **Used by:** Requirements 13, 14 and 22.

### OQ-2: ML Kit translation binding

- **Conflict:** D-027 puts ML Kit on-device translation first, but no React Native binding is known to support SDK 58, RN 0.88 and the New Architecture. D-005 gives a local Kotlin Expo Module as the fallback for OCR.
- **Sources:** D-005, D-027, stack steering (dependencies, native code).
- **Recommended default:** the owner approves a compatibility check during G2. If no binding qualifies, a local Expo Module around ML Kit translation is written, as for OCR. If neither is feasible in the G2 time box, every pair is routed to OpenRouter, with a decision entry. No criterion is dropped in either case.
- **Used by:** Requirements 3 and 4.

### OQ-3: Secure storage dependency

- **Conflict:** D-028 requires Android Keystore-backed secure storage for the user's key. `expo-secure-store` is the candidate, but stack steering requires owner approval and a cited compatibility check.
- **Sources:** D-028, stack steering, CAPABILITY-MAP.md §4.B ("Needs before start").
- **Recommended default:** the owner approves `expo-secure-store` for AT-G2-11, and the agent checks the Expo docs for SDK 58 and RN 0.88 before installing it with `npx expo install`. Without approval, the key section is not built and only the team route exists.
- **Used by:** Requirement 8.

### OQ-4: Proxy hosting

- **Conflict:** D-013 leaves hosting to G2. Without a deployed, funded Proxy, users without their own key see `TR_NOT_CONFIGURED` on cloud pairs (D-028), and the README must say so.
- **Sources:** D-013, D-028, QUALITY-GATES.md G2 stop condition.
- **Recommended default:** the owner chooses a host during G2 after the evaluation shows which pairs need the cloud. This spec fixes the contract and behaviour, not the host.
- **Used by:** Requirements 5 and 7.

### OQ-5: Pinned model, prompt and constants

- **Conflict:** D-028 requires one pinned model, but no model has been evaluated. The docs give no value for the on-device timeout, the cloud timeout, the output length ratio, the digit-sequence length, the per-IP rate limit, `minAnchors`, `minScore`, the rotation tolerance or the touch margin.
- **Sources:** D-027, D-028, ARCHITECTURE.md §8 and §9 (proposed values), QUALITY-GATES.md (threshold note).
- **Recommended default:** every value is a Named threshold constant, set in G2 or G3 from measurements on the Reference phone, and recorded in `docs/DECISIONS.md` before the related device measurements. ARCHITECTURE.md's proposed values (5 s timeout, 50 strings, 5,000 characters) are the starting points. This document invents no numbers.
- **Used by:** Requirements 4, 5, 7, 10, 18, 19 and 21.

### OQ-6: Hindi and Kannada reviewers

- **Conflict:** G2 ratings (AT-G2-02), UI strings and TM-01 explanations were written to need Fluent_Reviewers (owner Q5). D-031 removed the reviewers from the plan.
- **Sources:** owner Q5, D-008, D-031, QUALITY-GATES.md G3 stop condition.
- **Resolved by D-031:** `hi` and `kn` strings and fixture content carry the status `unreviewed` and are never called reviewed. AT-G2-02 is the owner's own check with its limits stated and no quality percentage. The README and demo disclose the `unreviewed` status. If a reviewer appears later, the `unreviewed` marks are replaced with the reviewer and date and the old rules apply again.
- **Used by:** Requirements 3, 14, 17 and 28.

### OQ-7: Tap priority and verified-machine labels

- **Conflict:** ARCHITECTURE.md §6 says a tap hits "the label or located component under the finger", and doesn't say which wins when a Label overlaps a Located component, or what a tap on a Label outside any component shows on TM-01.
- **Sources:** ARCHITECTURE.md §6, D-010, PRODUCT.md (Explore).
- **Recommended default:** on a verified machine, a Located component wins over a Label. A tap on a Label that is not inside any Located component shows the Label's translation and no component claim.
- **Used by:** Requirements 21, 22 and 23.

### OQ-8: Saving a key while offline

- **Conflict:** D-028 says the key is checked with `GET /api/v1/key` before saving. It doesn't say what happens without a network.
- **Sources:** D-028, AT-G2-11.
- **Recommended default:** the key isn't saved offline. The Settings_Screen says it can't check the key without a network, and the user tries again online.
- **Used by:** Requirement 8.

### OQ-9: Error code when an on-device language model can't be downloaded

- **Conflict:** ML Kit translation needs a language model of about 30 MB downloaded on first use (D-027). ARCHITECTURE.md §8 has no code for a failed model download. D-027 says this case must show a fallback state, not a translation.
- **Sources:** D-027, ARCHITECTURE.md §8, CAPABILITY-MAP.md §1 (rule 4: a new code needs a DECISIONS.md entry).
- **Recommended default:** reuse `TR_OFFLINE` when the download fails for lack of network, with the marker "Offline", and `TR_PROVIDER_ERROR` for any other download failure. No new code is added.
- **Used by:** Requirement 4.

### OQ-11: Documents that still carry the old wording (D-030, D-031)

- **Conflict:** PRODUCT.md P3 (language list and what ships) and the reviewer wording in PRODUCT.md ("verified machine" item 3) and ARCHITECTURE.md §10 (`review` field of the fixture type, `GD_FIXTURE_INVALID` rejecting a workflow with no reviewer) disagree with D-030 and D-031. QUALITY-GATES.md AT-G2-02, AT-G3-05 and the G3 stop condition "No reviewers" do too.
- **Sources:** D-030, D-031 (Consequences), PRODUCT.md P3, ARCHITECTURE.md §10.
- **Recommended default:** this spec follows D-030 and D-031 now. The owner confirms and the documents above are updated in a separate change. Until then, the docs win on conflict (product steering) and this conflict stays flagged here.
- **Used by:** Requirements 3, 14 and 17.

### OQ-10: Allocation with spec A

- **Conflict:** CAPABILITY-MAP.md §4.B lists the TranslationProvider interface, the Not-configured adapter and `t(key)` in B, while spec A's OQ-1 and OQ-2 propose moving them to A.
- **Sources:** CAPABILITY-MAP.md §4 and §7 ("Pending allocation change"), spec A OQ-1 and OQ-2.
- **Recommended default:** whichever spec owns them, this spec's criteria extend them. If A owns them, B adds adapters, routing and string reviews. If not, B adds them first.
- **Used by:** Requirements 1, 9 and 14.

## Dependencies

- **Spec A (`camera-ocr-geometry`):** A's contracts (`FrameRef`, `OcrResult`, `OcrLine`, the Overlay_Layer, `geometry` transforms and `placeLabels`) must be merged, and AT-G1-02 must pass, because translation on bad OCR proves nothing (CAPABILITY-MAP.md §4.B).
- **TM-01 images (D-029, D-032):** the iPad image fixture is chosen. The MachineFixture's boxes stay DRAFT until measured from the final images, and DT-G3 tests can't run until the images exist.
- **Owner Q4 (reference phone):** not named. G0 build gate B1 hasn't run, and no phone is connected. Every device criterion is "device validation pending".
- **Owner Q5 (hi and kn reviewers):** none named; removed from the plan by D-031. See OQ-6.
- **DEFERRED (D-030):** OpenRouter account and team key: a team account and a key with a credit limit, held only in the backend's environment (D-028).
- **DEFERRED (D-030):** proxy hosting (D-013). See OQ-4.
- **Dependencies needing owner approval before install:** `expo-secure-store` (OQ-3, DEFERRED by D-030 with the key section), the ML Kit translation binding or local module (OQ-2), and a property-test library (fast-check candidate) if spec A hasn't added it.
- **Proposed decisions:** D-007 (provider chosen after the spike), D-008, D-010, D-012, D-013 and D-017 are still Proposed. D-027 and D-028 are Accepted (user) for OpenRouter-only and the user key, with the detail Proposed. These requirements assume them.
- **Static gates:** the module-boundary lint rule (Q4) isn't added, so Requirement 26 criterion 8 has no automatic check yet.
- **Recorded OCR snapshots:** none exist yet. Tests that need OCR input wait for the first snapshot export on the Reference phone (spec A).
- **Downstream:** spec C (`guided-ticket-workflow`) needs `MachineMatch`, `locateComponents` and the MachineFixture from this spec, and can't start until AT-G3-01 and AT-G3-02 pass on the phone (CAPABILITY-MAP.md §4.C).
- **Stop and pivot conditions:** the G2 and G3 conditions in `docs/QUALITY-GATES.md` apply unchanged: Kannada fails the owner's check, false matches, and (DEFERRED, D-030) the backend can't be deployed in time. The "no reviewers" condition is superseded by D-031.
