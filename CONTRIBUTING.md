# Contributing to PrismSpace

Copyright © 2026 Nobin Sijo ([NobinSijo7T](https://github.com/NobinSijo7T)).

PrismSpace source is licensed under Apache-2.0. This document describes the
project's contribution and repository-access policy; it does not modify or
add restrictions to the standard Apache-2.0 license.

## Dev Space collaboration

Collaborators are welcome to propose, implement, test, document, and improve
the existing developer tools in the Dev Space, including tools under:

- `public/dev-space/`
- `components/tools/`
- `app/dev-space/`
- supporting tool-specific code in `lib/`, `hooks/`, and `components/`

Contributors may add new independent Dev Space tools, improve existing tool
UX, fix bugs, add tests, and improve documentation through normal review.
Contributions must include the Apache-2.0 SPDX header where appropriate,
preserve third-party notices, and identify any copied or adapted material.

## Core AI and model boundary

The following areas are maintainer-controlled and are not open for
unreviewed collaborator changes:

- `model/` model architecture, training, routing, reward, safety, and
  evaluation code;
- `model/artifacts*/` serialized models, indexes, checkpoints, and reports;
- `model/datasets/` training, validation, and test data;
- model-serving and inference integration that changes model behavior,
  governance, safety, routing, or data handling, including
  `backend/model_inference.py` and related deployment configuration.

Collaborators must not train, replace, fine-tune, redistribute, or contribute
changes to core AI models, model weights, datasets, checkpoints, routing
policies, or safety behavior without prior written authorization from Nobin
Sijo. Authorized work must document the model/data source, version, license,
provenance, evaluation impact, and redistribution terms before it is merged.

This is a repository contribution and access rule. It does not purport to
override Apache-2.0 rights that a recipient may otherwise have in law, and it
does not grant permission to redistribute third-party models or datasets.

## Contribution requirements

1. Keep Dev Space changes focused and include reproducible steps or tests.
2. Do not commit API keys, private user data, gated datasets, or model
   artifacts unless explicitly authorized and cleared for redistribution.
3. Preserve copyright, license, attribution, and NOTICE information.
4. Disclose third-party, generated, AI-assisted, or copied material and its
   provenance when known.
5. By submitting a contribution, you confirm that you have the right to
   submit it under Apache-2.0, unless a separate written agreement says
   otherwise.

Nobin Sijo is the final maintainer for contribution scope, core AI access,
licensing exceptions, and release approval.
