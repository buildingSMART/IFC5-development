# This is a small script for encoding an array of points into a base64 string. 
import json
import sys
import base64
import struct

def main():
    if len(sys.argv) != 2:
        print("Usage: python script.py '[[0.0, 1.0, 2.0], [3.0, 2.0, 1.0]]'")
        sys.exit(1)
    json_str = sys.argv[1]
    data = json.loads(json_str)
    # flatten
    array = []
    for point in data:
        array += point
    
    # use < for little endian
    binary = struct.pack(f'<{len(array)}f', *array)
    # print(binary)
    base64_str = base64.b64encode(binary).decode('ascii')
    print(base64_str)

if __name__ == '__main__':
    main()