"""Setup for worldmap XBlock."""

import os
from setuptools import setup


# def package_data(pkg, root):
#     """Generic function to find package_data for `pkg` under `root`."""
#     data = []
#     for dirname, _, files in os.walk(os.path.join(pkg, root)):
#         for fname in files:
#             path = os.path.relpath(os.path.join(dirname, fname), pkg)
#             data.append(path)
#
#     return {pkg: data}

def find_package_data(pkg, data_paths):
    """Generic function to find package_data for `pkg` under `root`."""
    data = []
    for data_path in data_paths:
        package_dir = pkg.replace(".", "/")
        for dirname, _, files in os.walk(package_dir + "/" + data_path):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), package_dir))
    return {pkg: data}

package_data = {}
# package_data.update(find_package_data("sample_xblocks.basic", ["public", "templates"]))
# package_data.update(find_package_data("sample_xblocks.thumbs", ["static"]))
package_data.update(find_package_data("worldmap", ["static", "public"]))


setup(
    name='worldmap-xblock',
    version='0.1',
    description='worldmap XBlock',   # TODO: write a better description.
    packages=[
        'worldmap',
    ],
    install_requires=[
        'XBlock',
    ],
    entry_points={
        'xblock.v1': [
            'worldmap               = worldmap:WorldMapXBlock'
        ]
    },
    package_data=package_data,
)