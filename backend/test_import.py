import sys
print('Python version:', sys.version)

try:
    from main import app
    print('Import success')
except Exception as e:
    print(f'Import error: {e}')
    import traceback
    traceback.print_exc()