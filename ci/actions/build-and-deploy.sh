#!/bin/bash -l

# Download Hugo 55.4.
curl -L https://github.com/gohugoio/hugo/releases/download/v0.55.4/hugo_extended_0.55.4_Linux-64bit.deb -o hugo.deb
sudo dpkg -i hugo.deb

# Install the latest version of Pulumi.
curl -fsSL https://get.pulumi.com | sh
export PATH="$PATH:$HOME/.pulumi/bin"

# Install Node dependencies for the website and the Pulumi program.
make ensure

# Build the website.
make build

# Sign into Pulumi.
pulumi login

# Select the dev stack.
pulumi stack select cnunciato/website-rebecca/dev --cwd infra

# Deploy it!
pulumi up --cwd infra --non-interactive --yes --skip-preview
