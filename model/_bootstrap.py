"""
PatientTriage.ai — Platform Runtime Bootstrap
Ensures standard Anaconda/Python C runtime DLL paths are present on Windows PATH if running locally,
without any hardcoded user paths.
"""

import os
import sys
from pathlib import Path

# Ensure root repository directory is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

if sys.platform == "win32":
    anaconda_dirs = [
        os.path.join(sys.prefix, "Library", "bin"),
        os.path.join(sys.prefix, "Library", "mingw-w64", "bin"),
        os.path.join(sys.prefix, "bin"),
        os.path.join(sys.prefix, "DLLs"),
    ]
    valid_dirs = [d for d in anaconda_dirs if os.path.exists(d)]
    if valid_dirs:
        os.environ["PATH"] = ";".join(valid_dirs) + ";" + os.environ.get("PATH", "")
        
        if hasattr(os, "add_dll_directory"):
            for d in valid_dirs:
                try:
                    os.add_dll_directory(d)
                except Exception:
                    pass
