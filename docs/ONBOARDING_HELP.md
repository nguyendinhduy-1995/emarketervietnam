# User Onboarding & Help Center

## Onboarding Wizard
When a Spa owner provisions a new workspace via `/signup`, they are redirected to `/onboarding`.
- The wizard gathers final setup context (Timezone, Business Logo, Initial Services).
- Upon completion, the tenant is officially dropped into their CRM Dashboard `/crm/[spaSlug]`.

## Help Center Integration
- **Structure**: The platform hosts standardized `HelpDoc` entries in the `platformDb`.
- **Tenant Experience**: Spa Admins can access `/crm/[spaSlug]/help` to view rich-text articles explaining how to use features like Appointments, Receipts, and Reports.
- **AI Support**: Subscribed tenants can trigger the Spa Assistant from the Help Center to rapidly search the docs or ask operational queries (powered by their Vaulted AI Keys).
