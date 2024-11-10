# Beefy Position Adjuster Gelato Web3 Function

A service for autonomously re-positioning for Beefy Cowcentrated Liquidity Manager.

## Overview

This service runs via Gelato. It uses a position multicall to find whether or not to adjust the range, then calls the strategy to move the tick range if necessary.

## Configuration

The service is configured via `user-args.json`.

## Development

yarn deploy:tickMover

### Testing

yarn test