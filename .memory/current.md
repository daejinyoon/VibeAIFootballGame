# Current Context

## Active Plan
[World Split Visibility, Player Facing, and Azure Hosting](./plans/2026-10-26-world-split-player-facing-azure-hosting.md)

## Active Phase
[P02 Azure Deployment](./phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/phase.md)

## Active Task
[T03 Azure Static Web App](./phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/T03-azure-static-web-app.md)

## Status
- The World Split skill removal plan is complete: runtime removal `d9f73ce`, save migration `edd61a4`.
- P01-T02 player-facing implementation and validation are complete; moving to P02-T03 Azure hosting.
- World Split itself has since been removed from the game; the remaining player-facing work is independent of that skill.
- Azure workflow is prepared locally. Cloud prerequisites remain unavailable: the user previously reported having no GitHub account and likely lacking Azure resource-group permission; no Git remote is configured.

## Next Step (IMPORTANT)
T03 workflow is prepared and the local production build passes. To finish deployment, create a GitHub account and private repository, obtain Azure permission to create/manage a Free Static Web App in the designated resource group, connect `master`, add the Azure-generated deployment token as `AZURE_STATIC_WEB_APPS_API_TOKEN`, then push and verify the public HTTPS URL. Keep T03 active until all cloud checks pass.
