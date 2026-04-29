# Contributing to Logistics CI/CD Pipeline

Thank you for considering contributing to this project! We welcome contributions from everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Branch Naming Convention](#branch-naming-convention)

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept criticism gracefully

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/logistics-ci-cd.git
   cd logistics-ci-cd
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/logistics-ci-cd.git
   ```

## 💻 Development Setup

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```

2. **Install dependencies**:
   ```bash
   pip install -r app/requirements.txt
   ```

3. **Install development tools**:
   ```bash
   pip install flake8 black pytest pytest-cov
   ```

4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

## 🤝 How to Contribute

### Reporting Bugs

- Use the GitHub issue tracker
- Include detailed steps to reproduce
- Provide system information (OS, Python version, etc.)
- Include error messages and stack traces

### Suggesting Features

- Open an issue with the "enhancement" label
- Clearly describe the feature and its benefits
- Provide examples or mockups if applicable

### Code Contributions

1. Check existing issues or create a new one
2. Comment on the issue to let others know you're working on it
3. Create a feature branch
4. Make your changes
5. Write/update tests
6. Update documentation
7. Submit a pull request

## 📝 Coding Standards

### Python Style Guide

- Follow [PEP 8](https://pep8.org/) style guide
- Maximum line length: 120 characters
- Use meaningful variable and function names
- Add docstrings to all functions and classes

### Code Quality Tools

Run these before committing:

```bash
# Linting
flake8 app/ --max-line-length=120

# Optional: Auto-formatting with black
black app/ --line-length=120
```

### File Organization

- Keep files focused and modular
- Place related functionality together
- Use clear file and directory names

## 🧪 Testing Requirements

All contributions must include tests.

### Writing Tests

- Place tests in `app/test_app.py`
- Use pytest fixtures for reusable test data
- Test both success and failure cases
- Aim for >80% code coverage

### Running Tests

```bash
# Run all tests
cd app
pytest test_app.py -v

# Run with coverage
pytest test_app.py --cov=. --cov-report=term-missing

# Run specific test
pytest test_app.py::test_function_name -v
```

### Test Checklist

- [ ] All new code has tests
- [ ] All tests pass locally
- [ ] Code coverage is maintained or improved
- [ ] No flake8 errors

## 🔄 Pull Request Process

### Before Submitting

1. **Update from upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   # Tests
   cd app && pytest test_app.py -v
   
   # Linting
   flake8 app/ --max-line-length=120
   ```

3. **Update documentation** if needed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How to Test
Steps to test your changes

## Checklist
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation
- [ ] No linting errors
- [ ] Followed coding standards
```

### Review Process

- At least one maintainer review required
- All CI checks must pass
- Address all review comments
- Keep PR focused and manageable in size

## 🌿 Branch Naming Convention

Use descriptive branch names:

- `feature/add-user-authentication`
- `bugfix/fix-shipment-tracking`
- `hotfix/critical-security-patch`
- `docs/update-api-documentation`
- `refactor/improve-error-handling`

## 📦 Commit Message Guidelines

Write clear commit messages:

```
feat: add shipment tracking endpoint

- Implement POST /shipment endpoint
- Add shipment validation
- Include tests for new endpoint

Closes #123
```

### Commit Message Format

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🔍 Code Review Checklist

When reviewing PRs, check:

- [ ] Code follows project style guide
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No unnecessary code changes
- [ ] Commit messages are clear
- [ ] No security vulnerabilities introduced
- [ ] Performance implications considered

## 💡 Tips for Success

- **Start small**: First-time contributors should start with small issues
- **Ask questions**: Don't hesitate to ask for help
- **Be patient**: Reviews may take time
- **Stay updated**: Pull from upstream regularly
- **Have fun**: Enjoy the learning process!

## 📞 Getting Help

- Open a discussion on GitHub
- Comment on relevant issues
- Check existing documentation
- Review closed PRs for examples

## 🎉 Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation (if applicable)

---

Thank you for contributing! Your efforts help make this project better for everyone.
