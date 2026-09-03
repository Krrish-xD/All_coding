// URL normalization & deduplication
#include <string>
#include <vector>
#include <unordered_set>
#include <algorithm>

static std::string normalize_once(std::string u) {
	// Remove fragments
	auto hash_pos = u.find('#');
	if (hash_pos != std::string::npos) u = u.substr(0, hash_pos);
	// Trim trailing slashes
	while (!u.empty() && u.back() == '/') u.pop_back();
	// Lowercase scheme and host (simple heuristic)
	auto scheme_pos = u.find("://");
	if (scheme_pos != std::string::npos) {
		for (size_t i = 0; i < scheme_pos; ++i) u[i] = std::tolower(u[i]);
		size_t host_start = scheme_pos + 3;
		size_t host_end = u.find('/', host_start);
		if (host_end == std::string::npos) host_end = u.size();
		for (size_t i = host_start; i < host_end; ++i) u[i] = std::tolower(u[i]);
	}
	return u;
}

std::vector<std::string> normalize_urls_fast(const std::vector<std::string>& urls) {
	std::unordered_set<std::string> seen;
	std::vector<std::string> out;
	out.reserve(urls.size());
	for (const auto& u : urls) {
		if (u.empty()) continue;
		auto nu = normalize_once(u);
		if (seen.insert(nu).second) out.push_back(nu);
	}
	return out;
}


