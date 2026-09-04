import sys
import os

# Ensure server root directory is on the Python path
server_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

from seed import seed

if __name__ == "__main__":
    seed()
