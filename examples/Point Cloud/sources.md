# Sources

## point-cloud.ifcx
### teapot_unoccluded

teapot_unoccluded from https://data.nrel.gov/submissions/153

Raghupathi, Sunand, Nicholas Brunhart-Lupo, and Kenny Gruchalla. 2020. "Caerbannog Point Clouds." NREL Data Catalog. Golden, CO: National Renewable Energy Laboratory. Last updated: January 21, 2025. DOI: 10.7799/1729892.

### PCD point cloud
Example file from https://pointclouds.org/documentation/tutorials/pcd_file_format.html

Converted to base64 using https://www.base64encode.org

## S1-pointcloud.ifcx

S1-pointcloud.ifcx source:
https://github.com/buildingsmart-community/Community-Sample-Test-Files/tree/main/IFC%202.3.0.1%20(IFC%202x3)/SDK%20-%20S1
Under "Point clouds" -> Download
Path: 02 Point clouds by date - Point clouds per dag/06-05-2019/PM/169097-Project-2022-07-12T10_55_44.105Z_group1_densified_point_cloud.las

Process to convert from LAS to PCD:

Use pdal (https://pdal.io/)
```
[
  { "type": "readers.las", "filename": "/data/169097-Project-2022-07-12T10_55_44.105Z_group1_densified_point_cloud.las"    },
  { "type": "filters.voxelcenternearestneighbor", "cell": 0.6 },
  {
    "type": "writers.pcd",
    "filename":    "/data/output.pcd",
    "compression": "ascii",
    "order":       "X,Y,Z,Red,Green,Blue",
    "keep_unspecified": false
  }
]
```

For some reason this results in separate R G B channels, which are not supported by PcdLoader or CloudCompare, so run the following custom python script:

(Removes xyz offset and unifies color into a uint32_t.)

```python
#!/usr/bin/env python3
import sys
import struct

import numpy as np

def pack_rgb_to_float(r, g, b):
    """Pack three 8-bit ints into a single float32 as used by PCL/PCD."""
    ui = (r << 16) | (g << 8) | b
    return struct.unpack('f', struct.pack('I', ui))[0]

def pack_rgb_uint(r, g, b):
    """Pack three 8-bit channels into one 24-bit uint stored in a 32-bit int."""
    return (r << 16) | (g << 8) | b

def process_pcd(in_file, out_file):
    with open(in_file, 'r') as f:
        lines = f.readlines()

    header = []
    data_start = 0

    for i, line in enumerate(lines):
        if line.startswith('DATA'):
            data_start = i
            header.append(line)
            break

        if line.startswith('FIELDS'):
            header.append('FIELDS x y z rgb\n')
        elif line.startswith('SIZE'):
            header.append('SIZE 4 4 4 4\n')
        elif line.startswith('TYPE'):
            header.append('TYPE F F F U\n')
        elif line.startswith('COUNT'):
            header.append('COUNT 1 1 1 1\n')
        else:
            header.append(line)

    data_lines = lines[data_start+1:]
    packed_lines = []
    xyzs = []
    for ln in data_lines:
        parts = ln.strip().split()
        if len(parts) < 6:
            continue  # skip malformed
        xyz = tuple(map(float, parts[0:3]))
        xyzs.append(xyz)

    avg = np.average(np.array(xyzs), axis=0)
    xyzs -= avg

    for ln in data_lines:
        parts = ln.strip().split()
        if len(parts) < 6:
            continue  # skip malformed
        x, y, z = np.array(tuple(map(float, parts[0:3]))) - avg
        # original RGB come in as floats, cast to int
        r = int(float(parts[3]))
        g = int(float(parts[4]))
        b = int(float(parts[5]))
        # scale 16-bit → 8-bit
        # breakpoint()
        r8, g8, b8 = r // 256, g // 256, b // 256
        # rgbf = pack_rgb_to_float(r8, g8, b8)
        ui = pack_rgb_uint(r8, g8, b8)
        packed_lines.append(f"{x} {y} {z} {ui}\n")

    with open(out_file, 'w') as f:
        f.writelines(header)
        f.writelines(packed_lines)

    with open(out_file + ".obj", 'w') as f:
        for v in xyzs:
            print("v", *v, file=f)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.pcd output.pcd")
        sys.exit(1)
    process_pcd(sys.argv[1], sys.argv[2])
```

Run pcl_converter (https://pointclouds.org) because using pdal would turn the uint32_t into a float64 again: 

```pcl_converter -f binary_compressed output2.pcd output3.pcd
```

Then, binary64 encode:
```python
import json
from base64 import b64encode

d = b64encode(open('output3.pcd', 'rb').read()).decode('utf-8')
```