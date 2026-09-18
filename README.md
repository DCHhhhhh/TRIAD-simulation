# TRIAD · Recorded Simulation / 已錄製模擬

Static research showcase. The six-participant discussion and eleven bilingual TRIAD tools are recorded, approved demonstration material. This site has no model backend, credentials, analytics or live simulation controls. The current recording contains 60 genuine Azure-generated utterances in a fictional research scenario. Historical usage and request-wording recovery are inspectable; two filtered requests have unknown usage. The browser cannot start or continue Azure inference.

## Repository contents

- `deploy/pages/`: complete self-contained public website and approved recording exports.
- `.github/workflows/pages.yml`: official GitHub Pages Actions workflow; uploads **only** `deploy/pages/`.
- `scripts/validate_pages.py`: validates publication hashes, exact file allowlist and static references before upload.

The original local research application, `.env`, Azure configuration, private histories, raw role-card directories and run storage do not belong in this repository.

## Preview

```bash
python3 scripts/validate_pages.py deploy/pages --repository .
python3 -m http.server 8020 --bind 127.0.0.1 --directory deploy/pages
```

Open http://127.0.0.1:8020/. No Python application backend is involved; Python here only serves static files. GitHub serves the same files under `/TRIAD-simulation/`.

## Deployment (after explicit owner approval)

1. Use the dedicated public repository **DCHhhhhh/TRIAD-simulation**.
2. Push only this prepared repository, not the local research project.
3. Settings → Pages → Source: GitHub Actions.
4. An approved push to `main` triggers Deploy reviewed TRIAD showcase; manual dispatch is also available.
5. Verify the URL returned by the deployment action, normally `https://dchhhhhh.github.io/TRIAD-simulation/`.

The workflow deploys on pushes to `main` and supports `workflow_dispatch`. Restrict the `github-pages` environment to the approved branch if needed.

## Update the approved website

Use the local TRIAD application's two-step exporter to prepare and inspect a recording, approve its exact content hashes, and export the full allowlisted set of recordings. Replace `deploy/pages/` with that generated directory. Do not manually edit generated data or copy raw runs into this repository. Run the validator, review the diff, commit/push after approval, and verify the automatic Pages workflow.

Local application commands:

```bash
python -m publishing.pages prepare --run RUN_ID --slug public-demo --title 'Public demonstration' --full-role-cards
# Review the generated local review/pages/public-demo/ packet in full.
# Set approved=true and reviewed_by in approval.json only after explicit data approval.
python -m publishing.pages export --approval review/pages/public-demo/approval.json
```

Repeat `--approval` for multiple approved recordings. An export includes only the listed packets; previously included recordings disappear if omitted. Approval of demonstration data and authorization to publicly deploy are separate decisions. Automated scanning cannot certify that prose has no confidential meaning; the owner must review it.

## Researcher cards and role-private knowledge

Approved fictional researcher cards may include `private_information`, labelled Role-private information / 角色專屬資訊. These are simulated facts initially known only to the owning role. Researcher visibility is separate from agent prompt access. Complete cards require explicit approval of that export; they are not included merely because a run exists. Actual credentials, identifying research data and unapproved histories remain excluded. Scenario text is exported verbatim from the reviewed saved configuration; missing historical fields are labelled missing.
