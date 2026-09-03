// Minimal parallel scraper using libcurl, C++20, exposed via pybind11 (in bindings.cpp)
#include <string>
#include <vector>
#include <future>
#include <mutex>
#include <optional>
#include <algorithm>
#include <regex>
#include <curl/curl.h>

struct ScrapeResult {
	std::string url;
	std::string text;
	std::string error;
};

static size_t write_cb(char* ptr, size_t size, size_t nmemb, void* userdata) {
	auto* buf = reinterpret_cast<std::string*>(userdata);
	buf->append(ptr, size * nmemb);
	return size * nmemb;
}

static std::string strip_scripts_styles(const std::string& html) {
	std::string out = html;
	try {
		// Remove scripts and styles
		out = std::regex_replace(out, std::regex("(?is)<script.*?>.*?</script>"), " ");
		out = std::regex_replace(out, std::regex("(?is)<style.*?>.*?</style>"), " ");
		// Remove comments
		out = std::regex_replace(out, std::regex("(?is)<!--.*?-->"), " ");
		// Remove tags
		out = std::regex_replace(out, std::regex("(?is)<[^>]+>"), " ");
		// Collapse whitespace
		out = std::regex_replace(out, std::regex("\\s+"), " ");
	} catch (...) {
		// If regex fails, return original
	}
	return out;
}

static ScrapeResult fetch_once(const std::string& url, long timeout_ms) {
	ScrapeResult res;
	res.url = url;
	CURL* curl = curl_easy_init();
	if (!curl) {
		res.error = "curl_init_failed";
		return res;
	}
	std::string body;
	curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
	curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
	curl_easy_setopt(curl, CURLOPT_MAXREDIRS, 5L);
	curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms);
	curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");
	struct curl_slist* headers = nullptr;
	headers = curl_slist_append(headers, "User-Agent: Mozilla/5.0 (compatible; dresearch/1.0)");
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
	curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
	CURLcode code = curl_easy_perform(curl);
	if (code != CURLE_OK) {
		res.error = curl_easy_strerror(code);
		curl_slist_free_all(headers);
		curl_easy_cleanup(curl);
		return res;
	}
	long status = 0;
	curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
	char* ctype = nullptr;
	curl_easy_getinfo(curl, CURLINFO_CONTENT_TYPE, &ctype);
	std::string content_type = ctype ? std::string(ctype) : "";
	curl_slist_free_all(headers);
	curl_easy_cleanup(curl);
	if (status != 200) {
		res.error = "http_" + std::to_string(status);
		return res;
	}
	auto lc = content_type;
	std::transform(lc.begin(), lc.end(), lc.begin(), ::tolower);
	if (lc.find("text/html") == std::string::npos && lc.find("text/plain") == std::string::npos) {
		res.error = "unsupported_content_type:" + content_type;
		return res;
	}
	res.text = strip_scripts_styles(body);
	return res;
}

std::vector<ScrapeResult> scrape_parallel(const std::vector<std::string>& urls, long timeout_ms = 15000) {
	std::vector<ScrapeResult> results(urls.size());
	std::vector<std::future<void>> futs;
	futs.reserve(urls.size());
	curl_global_init(CURL_GLOBAL_ALL);
	for (size_t i = 0; i < urls.size(); ++i) {
		futs.emplace_back(std::async(std::launch::async, [&, i]() {
			results[i] = fetch_once(urls[i], timeout_ms);
		}));
	}
	for (auto& f : futs) {
		try { f.get(); } catch (...) {}
	}
	curl_global_cleanup();
	return results;
}


