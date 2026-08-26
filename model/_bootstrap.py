"""
Windows Anaconda DLL path configuration helper.
Ensures standard Anaconda C/C++ runtime DLL paths are present on Windows PATH and DLL directory table.
"""

import os
import sys

if sys.platform == "win32":
    anaconda_dirs = [
        os.path.join(sys.prefix, "Library", "bin"),
        os.path.join(sys.prefix, "Library", "mingw-w64", "bin"),
        os.path.join(sys.prefix, "bin"),
        os.path.join(sys.prefix, "DLLs"),
        r"C:\Users\Chittvan\anaconda3\Library\bin",
        r"C:\Users\Chittvan\anaconda3\Library\mingw-w64\bin",
        r"C:\Users\Chittvan\anaconda3\bin",
        r"C:\Users\Chittvan\anaconda3\DLLs",
    ]
    valid_dirs = [d for d in anaconda_dirs if os.path.exists(d)]
    os.environ["PATH"] = ";".join(valid_dirs) + ";" + os.environ.get("PATH", "")
    
    if hasattr(os, "add_dll_directory"):
        for d in valid_dirs:
            try:
                os.add_dll_directory(d)
            except Exception:
                pass
