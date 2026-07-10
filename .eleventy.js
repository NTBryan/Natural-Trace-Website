const yaml = require("js-yaml");
const { HtmlBasePlugin } = require("@11ty/eleventy");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  // Enable YAML data files (.yml / .yaml)
  eleventyConfig.addDataExtension("yml,yaml", contents => yaml.load(contents));

  // Date filter for templates
  eleventyConfig.addFilter("date", (dateObj, format) => {
    const d = new Date(dateObj);
    const months = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
    if (format === "%Y-%m-%d") {
      return d.toISOString().slice(0, 10);
    }
    if (format === "%B %d, %Y") {
      return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
    }
    return d.toLocaleDateString();
  });

  // Insights collection (blog posts from src/insights/)
  eleventyConfig.addCollection("insights", collection =>
    collection.getFilteredByGlob("src/insights/**/*.md").sort((a, b) => a.date - b.date)
  );

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addWatchTarget("src/assets/");

  eleventyConfig.ignores.add("src/admin/**");
  eleventyConfig.ignores.add("src/pages/home.njk");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    pathPrefix: process.env.PATH_PREFIX || "/",
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
