// Text utilities: cleanup and simple dedup placeholder
#include <string>
#include <vector>
#include <regex>
#include <unordered_set>

std::vector<std::string> clean_texts_fast(const std::vector<std::string>& texts) {
	std::vector<std::string> out;
	out.reserve(texts.size());
	for (const auto& t : texts) {
		std::string x = t;
		try {
			// Normalize whitespace
			x = std::regex_replace(x, std::regex("\\s+"), " ");
		} catch (...) {}
		// Trim
		if (!x.empty() && x.front() == ' ') x.erase(x.begin());
		if (!x.empty() && x.back() == ' ') x.pop_back();
		out.push_back(x);
	}
	return out;
}


