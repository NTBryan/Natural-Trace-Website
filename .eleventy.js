const yaml = require("js-yaml");

module.exports = function(eleventyConfig) {
  // Enable YAML data files (.yml / .yaml)
  eleventyConfig.addDataExtension("yml,yaml", contents => yaml.load(contents));

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
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
