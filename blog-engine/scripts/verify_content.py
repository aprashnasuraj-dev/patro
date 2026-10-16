#!/usr/bin/env python3
"""Fail-closed content audit. This CLI never promotes drafts to approved/published."""
import argparse,json
from pathlib import Path
from engine_path import unavailable
