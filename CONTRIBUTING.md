# Contributing to Sasta Mall

Thank you for considering a contribution!

## Before you start

1. Read the README and follow the local installation steps.
2. Check existing issues and pull requests to avoid duplicate work.
3. For a significant feature, open an issue first to discuss the proposed change.

## Development workflow

1. Fork the repository.
2. Clone your fork.
3. Create a feature branch:

   ```bash
   git checkout -b feature/short-description
   ```

4. Install dependencies and configure `.env` as described in the README.
5. Make focused changes and test the affected customer and admin flows.
6. Commit with a clear message:

   ```bash
   git add .
   git commit -m "Add short description"
   ```

7. Push your branch and open a Pull Request against `main`.

## Pull request checklist

- [ ] The change has a clear description and purpose.
- [ ] Existing customer and admin flows have been checked.
- [ ] No `.env`, passwords, customer records, database files, receipts, or private uploads are included.
- [ ] Database changes are additive and documented where possible.
- [ ] Screenshots are included for significant UI changes.

Please keep pull requests focused and avoid unrelated formatting changes.
