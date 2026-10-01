# PrismSpace licensing and release audit

Audit date: 2026-10-01  
Scope: repository working tree, tracked source, installed npm tree, Python manifests, deployment files, bundled assets, and locally present model/data directories.

This is a technical compliance assessment, not legal advice. `UNKNOWN` means that the repository did not contain enough authoritative evidence to make a licensing determination.

## Executive Summary

The source repository did not contain a root license, while `package.json` declared ISC. The project is a Next.js/React application with a Python model service, bundled binary/design assets, third-party AI API integrations, and a large locally present but Git-ignored model/data tree.

The recommended project license is Apache-2.0 for PrismSpace-authored source code. That recommendation is compatible with the permissive npm majority and provides an express patent grant. It does not and cannot relicense third-party packages, fonts, images, models, datasets, generated artifacts, or service-provider terms.

**Status: NOT READY** for a whole-repository public source archive, Docker image, npm publication, or model/data redistribution. The principal blockers are unverified bundled fonts/assets, a custom GSAP license, missing package license metadata, unresolved Python dependency licenses, and third-party/gated datasets that are present locally and may enter deployment build contexts.

## Project License Recommendation

* License: Apache License 2.0
* SPDX identifier: `Apache-2.0`
* Copyright owner: Nobin Sijo (GitHub: `NobinSijo7T`)
* Reason: permissive commercial use and redistribution, modification permission, and an express patent grant; no copyleft dependency was found in the resolved npm tree.
* Confidence: Medium. This owner statement is supplied by the project maintainer; confirm that all contributors and employers have assigned or authorized the relevant rights.

Only the original PrismSpace-authored material should be treated as Apache-2.0. Third-party material remains under its own terms.

## Contribution and Access Policy

`CONTRIBUTING.md` grants collaborators broad repository-level permission to
propose and improve Dev Space tools, while reserving core AI/model code,
weights, datasets, artifacts, routing, and safety behavior for maintainer
authorization. This is an access and contribution-review policy; it is not a
restriction added to Apache-2.0. Apache-2.0's standard permissions remain
unchanged, and third-party model/data licenses remain controlling.

## License Compatibility Matrix

| Candidate | Commercial use | Copyleft/source-sharing effect | Patent terms | Fit for this repository |
|---|---|---|---|---|
| MIT | Yes | Minimal; retain notice | No express patent grant | Possible, but weaker patent posture |
| Apache-2.0 | Yes | Minimal; preserve notices and mark modified files | Express patent grant and termination clause | Recommended for authored source |
| BSD-2-Clause / BSD-3-Clause | Yes | Minimal; retain notice; BSD-3 adds non-endorsement | No express patent grant | Compatible, but no evidence of preference |
| MPL-2.0 | Yes | File-level copyleft for modified MPL files | Yes | Unnecessary complexity for this codebase |
| LGPL/GPL | Yes subject to copyleft obligations | Linking/distribution obligations; GPL can require whole combined work under GPL-compatible terms | Varies | Not selected; no need to impose this posture |
| AGPL | Yes subject to network-source obligations | Network use can trigger corresponding-source duties | Varies | Not selected; especially unsuitable without an intentional SaaS policy |

Apache-2.0 is compatible with MIT, ISC, BSD, 0BSD, Unlicense, CC0, and ordinary Apache-2.0 dependencies when their notices are preserved. The custom GSAP terms, BlueOak/Python-2.0 terms, CC-BY data, missing metadata, and non-code materials require separate review rather than automatic relicensing.

## Dependency License Inventory

### Resolved npm inventory

Evidence: `package.json`, `package-lock.json`, and the installed `node_modules` package manifests. The installed dependency tree contained 504 package-path records:

| License family / identifier | Records | Direct or transitive | Attribution / redistribution finding |
|---|---:|---|---|
| MIT | 425 | Both | Retain copyright and license notices; redistribution permitted |
| ISC | 28 | Both | Retain copyright and license notices; redistribution permitted |
| Apache-2.0 | 18 | Both | Preserve license, notices, and Apache NOTICE content where supplied |
| BSD-3-Clause | 10 | Transitive and/or dev | Retain notice and non-endorsement text |
| BSD-2-Clause | 5 | Transitive and/or dev | Retain notice |
| Unlicense / 0BSD / CC0-1.0 | 8 | Transitive | Public-domain/zero-condition treatment is subject to the original text |
| BlueOak-1.0.0 | 2 | Transitive | Non-SPDX/custom policy review required |
| Python-2.0 | 1 | Transitive | Retain the Python license text and attribution |
| Custom GSAP “no charge” license | 1 (`gsap@3.15.0`) | Direct | Review the current commercial and redistribution terms at [GSAP licensing](https://gsap.com/licensing/) |
| CC-BY-4.0 | 1 (`caniuse-lite@1.0.30001800`) | Transitive | Attribution required; this is not a software license for PrismSpace source |
| Missing license field | 6 | Transitive | UNKNOWN until authoritative package license evidence is collected |

The direct npm dependencies are listed in `package.json`; their resolved versions are in `package-lock.json`. Direct packages include React, Next.js, Three.js, React Three Fiber/Drei/Rapier, GSAP, Motion/Framer Motion, Lucide, Dexie, Zod, and UI utilities. No GPL, AGPL, LGPL, EPL, CDDL, SSPL, BUSL, or other strong-copyleft package was identified in this installed npm tree.

Manual-review package records:

| Package | Version | Evidence / issue | Action |
|---|---:|---|---|
| `gsap` | 3.15.0 | Manifest declares a custom “Standard 'no charge' license” | Preserve its terms; confirm the exact version terms before commercial redistribution |
| `@react-three/rapier` | 1.5.0 | No license field in installed manifest; repository points to GitHub | Confirm the upstream package license and retain it |
| `busboy`, `fast-shallow-equal`, `react-universal-interface`, `webgl-constants`, `streamsearch` | resolved versions | No license field detected in installed manifests | Inspect authoritative upstream repositories and add exact notices |
| `isexe`, `minimatch` | resolved versions | BlueOak-1.0.0 | Legal/policy review; do not call this MIT/Apache without evidence |
| `argparse` | 2.0.1 | Python-2.0 | Preserve the original license and attribution |
| `caniuse-lite` | 1.0.30001800 | CC-BY-4.0 metadata | Preserve attribution; treat as data, not as an Apache-compatible code license |

The repository does not contain a Python lockfile. `model/requirements.txt` and `model/requirements-api.txt` use unpinned ranges and include 20 direct training/inference packages. Their exact transitive versions and licenses therefore cannot be established reproducibly from this repository. This is an unresolved inventory gap, not evidence that they are incompatible.

### Python dependency inventory

| Manifest | Packages | Version state | License / obligations |
|---|---:|---|---|
| `model/requirements.txt` | 20 | Mostly unpinned | UNKNOWN until a lock/export with package metadata is generated; audit `torch`, `transformers`, `datasets`, `sentence-transformers`, `faiss`, `catboost`, and all transitive packages |
| `model/requirements-api.txt` | 9 | Ranged, not locked | UNKNOWN until resolved; image redistribution must include each package's applicable notices |

### Second-pass validation

The supplied `checking-license-compliance` skill could not execute because `scripts/check_licenses.py` imports a missing `lib.finding` module. This is recorded as a failed validation/tooling blocker; it is not a clean result. The first skill provided read-only audit guidance, and the manual inventory above is the available evidence-based fallback.

## Third-Party Components

* Next.js, React, Three.js ecosystem, UI utilities, and most npm dependencies are separately licensed permissive software. Do not replace their notices with the PrismSpace license.
* SQLite WASM files under `public/sqlite/` are bundled compiled distributions. Their exact upstream version and corresponding SQLite/sqlean notices were not established from repository metadata.
* `components/`, `public/`, `images/`, `fonts/`, and `diagrams/` contain material with no complete provenance manifest.
* `model/artifacts/` contains serialized model outputs and indexes. These are ignored by Git but are referenced by `model/Dockerfile`; a local Docker build can still include them.

## Source-Code Provenance

All 217 tracked PrismSpace-authored source/configuration files in the audited code directories now carry `Copyright 2026 Nobin Sijo (NobinSijo7T)` and `SPDX-License-Identifier: Apache-2.0` headers. Deliberately excluded are third-party SQLime code, dependency/vendor trees, binary assets, datasets, generated PDFs, and other materials whose ownership or license is separate or unknown.

Repository comments and documentation mention AI-assisted work, shadcn-style components, external package ecosystems, and many linked upstream projects, but do not establish authorship or license for copied snippets. No reliable line-by-line provenance record exists. All copied snippets and generated code without source headers are `PROVENANCE UNKNOWN` until reviewed by the copyright owner.

The model dataset documentation does identify upstream sources such as AgentInstruct, APIBench, BEIR, BFCL, LiveCodeBench, OpenAssistant, RouteLLM, GAIA, SWE-bench, and others. Those source repositories/datasets must be treated under their own licenses and terms; the project Apache-2.0 license does not cover them.

## Asset Licensing

The repository contains at least 30 font files, hundreds of raster images, GIFs, SVGs, two GLB files, PDFs, and SQLite WASM/JavaScript assets. No per-asset license manifest, purchase receipt, source URL, or redistribution permission was found. Several filenames include “demo” and “trial”, which is a risk signal but not proof of a restriction.

Fonts, logos, images, 3D files, generated diagrams, and SQLite distributions are therefore `UNKNOWN`. They may remain in a private working tree, but must not be included in a public source archive, Docker image, npm tarball, or commercial deployment until each asset is cleared or replaced with a documented redistributable asset.

## AI / Model / Dataset Licensing

The code integrates provider APIs for OpenRouter, Groq, NVIDIA, OpenAI, Anthropic, Google, and DeepSeek. API keys are user-supplied (BYOK); the service terms, model terms, acceptable-use policies, output rights, and retention rules are provider-specific and are not software licenses. Users must accept the applicable provider terms themselves.

The locally present `model/datasets/` tree is Git-ignored and contains many nested upstream repositories/data exports. It includes:

* OASST1 and Qwen materials with Apache-2.0 metadata;
* GAIA test/validation material whose README states that it must not be reshared in crawlable form;
* other datasets with only README-level references or no license evidence in the checked-out copy;
* serialized artifacts and reward-model checkpoints whose base-model/data provenance is not fully recorded.

Do not publish or bake `model/datasets/` or `model/artifacts*/` into a public distribution until every dataset/model has a license and redistribution review. Dataset, model-weight, and software licenses must be tracked separately.

## API and Service Restrictions

The application calls external AI APIs and may send user prompts or tool data. Provider terms may restrict automated access, reverse engineering, model benchmarking, data retention, or redistribution of outputs. These are contractual service risks, not dependency-license findings. Add provider-specific terms and privacy/data-flow review before operating a public SaaS.

## Deployment Considerations

* **npm:** Do not publish the application as a single Apache-2.0 work without clarifying the custom GSAP terms, missing package metadata, and preserving dependency notices. Use `npm pack --dry-run` to verify asset scope.
* **Docker:** The model Dockerfile copies local serialized artifacts. Build contexts must exclude gated datasets and unlicensed assets, and the image must ship dependency notices.
* **Self-hosting:** Permissive npm source can generally be self-hosted after notice compliance; Python and model/data licenses remain unresolved.
* **Commercial deployment:** Apache-2.0 authored code permits it, but GSAP, fonts, images, model/data rights, and API provider terms must be cleared separately.
* **SaaS:** Apache-2.0 and ordinary permissive dependencies do not impose source disclosure merely because the app is hosted. AGPL was not found in npm; provider terms and model/data terms still apply.
* **Modified redistribution:** Preserve Apache/third-party notices, mark modified files where required, and do not apply Apache-2.0 to third-party assets or datasets.

## Attribution Requirements

`NOTICE` records the current high-level obligations. A release-specific third-party inventory should be generated from the exact production install and Python lock/export, preserving each package's license text and copyright notices. Apache, MIT, BSD, ISC, CC-BY, Python-2.0, BlueOak, GSAP, and data/model notices cannot be collapsed into one project notice.

## Copyright Ownership Issues

The project maintainer identifies the PrismSpace-authored source owner as Nobin Sijo (`NobinSijo7T`). No contributor agreement, employer assignment, or asset purchase record is established in the repository. Before public release, the owner must confirm that they control the rights to PrismSpace-authored code and every bundled non-code asset.

## Blocking Issues

### 1. Non-redistributable or unknown assets

* **Component:** fonts, images, SVG/GLB assets, SQLite WASM, PDFs
* **File/package:** `fonts/`, `public/fonts/`, `images/`, `public/images/`, `*.glb`, `public/sqlite/`, `diagrams/`
* **License:** UNKNOWN
* **Problem:** no authoritative provenance or redistribution permission
* **Why it matters:** public deployment and source/container redistribution may infringe third-party rights
* **Recommended fix:** create an asset manifest with source, license, attribution, and permission; replace uncleared assets
* **Can it be replaced?:** yes, technically
* **Release impact:** blocks whole-repository public release

### 2. Gated and mixed-license datasets/models

* **Component:** local ML corpus and serialized artifacts
* **File/package:** `model/datasets/`, `model/artifacts*/`, `model/Dockerfile`
* **License:** mixed; several UNKNOWN; GAIA test/validation gated
* **Problem:** ignored data can still enter Docker/build contexts and is not covered by Apache-2.0
* **Why it matters:** redistribution restrictions and model/data terms can prohibit public sharing
* **Recommended fix:** exclude from release artifacts, document provenance, or obtain permission for each source
* **Can it be replaced?:** yes, with cleared datasets/models
* **Release impact:** blocks model/data and current Docker release

### 3. GSAP custom license

* **Component:** animation dependency
* **File/package:** `gsap@3.15.0`
* **License:** custom GSAP “no charge” license
* **Problem:** not an SPDX standard identifier; exact commercial redistribution scope needs confirmation
* **Why it matters:** an Apache project license cannot override it
* **Recommended fix:** retain its current license and obtain legal confirmation, or replace with a clearly permissive library
* **Can it be replaced?:** yes, but animation behavior may need changes
* **Release impact:** blocks a clean legal sign-off for commercial redistribution

### 4. Incomplete dependency evidence

* **Component:** missing npm license metadata and unresolved Python graph
* **File/package:** listed in dependency inventory; `model/requirements*.txt`
* **License:** UNKNOWN/custom
* **Problem:** no reproducible Python lock and six npm packages without license fields
* **Why it matters:** obligations cannot be verified from names alone
* **Recommended fix:** resolve exact versions, collect authoritative package licenses, add a release inventory, and repair the second-pass scanner
* **Can it be replaced?:** package-by-package, if needed
* **Release impact:** blocks a complete audit claim

## Recommended Remediation

1. Confirm the rights holder and Apache-2.0 authorization for PrismSpace source.
2. Lock Python dependencies and produce a production-only license inventory.
3. Resolve the six missing npm license fields and confirm `@react-three/rapier` upstream licensing.
4. Review GSAP's exact license for the pinned version.
5. Create and maintain an asset provenance manifest; remove uncleared assets from release builds.
6. Exclude `model/datasets/` and `model/artifacts*/` from public releases until every source is cleared; especially exclude GAIA test/validation data.
7. Repair or replace the supplied second-pass checker so both required validation passes can run.
8. Regenerate `NOTICE` from the exact production dependency set and verify package license files are shipped where required.

## Final Release Checklist

- [x] Root Apache-2.0 license file added and package metadata aligned.
- [x] README and NOTICE now distinguish project source from third-party materials.
- [x] npm dependency tree manually classified from installed manifests.
- [ ] Copyright ownership and license authorization confirmed.
- [ ] Python lockfile and exact license inventory created.
- [ ] Missing npm licenses and GSAP terms resolved.
- [ ] Fonts, images, 3D, SQLite, and generated assets cleared or removed from release.
- [ ] Dataset/model provenance and redistribution permissions documented.
- [ ] Gated datasets excluded from Docker and public archives.
- [ ] Both compliance skills run successfully after remediation.
- [ ] Production `npm pack`/Docker contents reviewed against NOTICE.

## Final Summary

| Category | Count |
|---|---:|
| Permissive | 496 npm records (including CC0; excludes CC-BY as data) |
| Weak Copyleft | 0 identified |
| Strong Copyleft | 0 identified |
| Proprietary / custom | 1 npm record (GSAP terms; review required) |
| Source Available | 0 identified as a software license; data/model terms are separate |
| Unknown | 6 npm records plus all unresolved Python packages and bundled assets |

The project is **NOT READY** for unrestricted public deployment or distribution. The Apache-2.0 setup is a reasonable source-code baseline, but it is conditional on the remediation above.
