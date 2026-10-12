<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use shared login presentation on `/` and `/auth`; keep maintenance under the authenticated layout so private UI requires a verified identity.
- Use Lovable Cloud Auth and owner-scoped profiles; never put credentials in client source or use profile data for authorization.
- Keep shared visual styling in semantic CSS tokens and route-specific metadata in the page metadata helper for consistent presentation.
