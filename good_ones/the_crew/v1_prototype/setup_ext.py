#!/usr/bin/env python3
import os
import sys
import shutil
from setuptools import setup, Extension
from setuptools.command.build_ext import build_ext

try:
	import pybind11  # type: ignore
	PYBIND11_INCLUDE = pybind11.get_include()
except Exception:
	PYBIND11_INCLUDE = ""

CPP_DIR = os.path.join(os.getcwd(), "cpp")
sources = [
	os.path.join(CPP_DIR, "bindings.cpp"),
	os.path.join(CPP_DIR, "scraper.cpp"),
	os.path.join(CPP_DIR, "textutils.cpp"),
	os.path.join(CPP_DIR, "urltools.cpp"),
]

extra_compile_args = ["-std=c++20"]
extra_link_args = []
libraries = ["curl"]

if sys.platform == "win32":
	# Windows flags may differ; rely on MSVC default std
	extra_compile_args = []
	libraries = ["libcurl"]

ext_modules = [
	Extension(
		"dresearch_cpp",
		sources=sources,
		include_dirs=[PYBIND11_INCLUDE] if PYBIND11_INCLUDE else [],
		extra_compile_args=extra_compile_args,
		extra_link_args=extra_link_args,
		libraries=libraries,
	),
]

class BuildExt(build_ext):
	def run(self):
		try:
			super().run()
		finally:
			build_temp = os.path.abspath(self.build_temp)
			if os.path.isdir(build_temp):
				shutil.rmtree(build_temp, ignore_errors=True)

setup(
	name="dresearch_cpp",
	version="0.1.0",
	description="Deep Research C++ helpers",
	ext_modules=ext_modules,
	cmdclass={"build_ext": BuildExt},
	zip_safe=False,
)


