// pybind11 bindings combining scraper, textutils, urltools
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <string>
#include <vector>

// Declarations from other translation units
struct ScrapeResult {
	std::string url;
	std::string text;
	std::string error;
};
std::vector<ScrapeResult> scrape_parallel(const std::vector<std::string>& urls, long timeout_ms);
std::vector<std::string> clean_texts_fast(const std::vector<std::string>& texts);
std::vector<std::string> normalize_urls_fast(const std::vector<std::string>& urls);

namespace py = pybind11;

PYBIND11_MODULE(dresearch_cpp, m) {
	m.doc() = "Deep Research C++ helpers (scraping/text/url)";

	py::class_<ScrapeResult>(m, "ScrapeResult")
		.def_readwrite("url", &ScrapeResult::url)
		.def_readwrite("text", &ScrapeResult::text)
		.def_readwrite("error", &ScrapeResult::error);

	m.def("scrape", [](const std::vector<std::string>& urls, long timeout_ms) {
		auto res = scrape_parallel(urls, timeout_ms);
		std::vector<py::dict> out;
		out.reserve(res.size());
		for (auto& r : res) {
			py::dict d;
			d["url"] = r.url;
			d["text"] = r.text;
			d["error"] = r.error;
			out.push_back(std::move(d));
		}
		return out;
	}, py::arg("urls"), py::arg("timeout_ms") = 15000);

	m.def("clean_texts", &clean_texts_fast, py::arg("texts"));
	m.def("normalize_urls", &normalize_urls_fast, py::arg("urls"));
}


