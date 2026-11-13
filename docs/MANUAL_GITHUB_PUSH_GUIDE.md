# Manual GitHub push

Review from PowerShell. The branch is `ui/service-redesign` and the configured `origin` is the Global Link GitHub repository.

```powershell
Set-Location -LiteralPath 'C:\Users\Asus\Documents\ChatGPT\globallink multiservices'
git status --short --branch
git remote -v
git log --oneline main..ui/service-redesign
git diff --stat main...ui/service-redesign
git diff --check main...ui/service-redesign
git push -u origin ui/service-redesign
```

Run the final command after reviewing the branch. Open a pull request in GitHub if desired.
