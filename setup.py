from setuptools import setup

setup(
    name="content-pipeline",
    version="0.1.0",
    py_modules=["pipeline"],
    install_requires=["tabulate"],
    entry_points={"console_scripts": ["pipeline=pipeline:main"]},
)
