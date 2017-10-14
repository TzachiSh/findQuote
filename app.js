/// in the fu will change
let language = "he";
let API_URL;
let trigger;
let list;
///////////////////////////

$(document).ready(() => {
  trigger = $(".language_selector");
  list = $(".languages");
  trigger.click(() => {
    trigger.toggleClass("active");
    list.slideToggle(500);
  });

  list.on("click", e => {
    trigger.click();
    e.preventDefault();
    changeLanguage(e.target.id);
  });

  $("#form").submit(() => {
    console.log(API_URL);

    const title = $(".text-search")
      .val()
      .toString();
    quoteController(
      title,
      quote => {
        const regex = /(<([^>]+)>)/gi;
        console.log(quote.quote);
        quote.quote = quote.quote.replace(regex, "");

        const quoteArray = quote.quote.split('" ', 2);
        $(".quoteDiv")
          .find("span")
          .html("");
        $(".title").html(quote.title);
        $(".quote").html("<b>" + quote.line + ": </b>" + quoteArray[0]);
        $(".place").html(quoteArray[1]);
        console.log(quote);
      },
      error => console.log(error)
    );

    return false;
  });
});

const changeLanguage = lan => {
  language = lan;
  if (language === "he") {
    $(trigger).html("שפה");
    $("input.btn").val("חפש");
    $("html").attr("dir", "rtl");

  } else {
    $("html").attr("dir", "");
    $(trigger).html("Language");
    $("input.btn").val("Search");
  }
};

const wikiQuoteApi = {
  openSearch: (title, success, error) => {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "opensearch",
        namespace: 0,
        suggest: "",
        search: title
      },

      success: function(result, status) {
        success(result[1]);
      },
      error: function(xhr, result, status) {
        error("Error with opensearch for " + titles);
      }
    });
  },
  getPageId: (titles, success, error) => {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "query",
        redirects: "",
        titles: titles
      },

      success: function(result, status) {
        var pages = result.query.pages;
        var pageId = -1;
        for (var p in pages) {
          var page = pages[p];
          // api can return invalid recrods, these are marked as "missing"
          if (!("missing" in page)) {
            pageId = page.pageid;
            break;
          }
        }
        if (pageId > 0) {
          success(pageId);
        } else {
          error("No results");
        }
      },

      error: function(xhr, result, status) {
        error("Error processing your query");
      }
    });
  },
  getSectionsForPage: (pageID, success, error) => {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        prop: "sections",
        pageid: pageID
      },

      success: function(result, status) {
        var sectionArray = new Array();

        var sections = result.parse.sections;

        for (var s in sections) {
          var splitNum = sections[s].number.split(".");
          if (splitNum.length > 1 && splitNum[0] === "1") {
            sectionArray.push({
              section: sections[s].index,
              line: sections[s].line
            });
          }
        }
        // Use section 1 if there are no "1.x" sections
        if (sectionArray.length === 0) {
          for (var s in sections) {
            if (sections.length - 3 == s) {
              break;
            }

            sectionArray.push({
              section: sections[s].index,
              line: sections[s].line
            });
          }
        }

        success({ titles: result.parse.title, sections: sectionArray });
      },
      error: function(xhr, result, status) {
        error("Error getting sections");
      }
    });
  },
  getQuoteForSection: (pageID, sectionIndex, success, error) => {
    $.ajax({
      url: API_URL,
      dataType: "jsonp",
      data: {
        format: "json",
        action: "parse",
        noimages: "",
        pageid: pageID,
        section: sectionIndex.section
      },

      success: function(result, status) {
        var quotes = result.parse.text["*"];
        var quoteArray = [];

        // Find top level <li> only
        var $lis = $(quotes).find("li:not(li li)");
        $lis.each(function() {
          // Remove all children that aren't <b>
          $(this)
            .children()
            .remove(":not(b)");
          var $bolds = $(this).find("b");

          // If the section has bold text, use it.  Otherwise pull the plain text.
          if ($bolds.html() != " " && $(this).html() != " ") {
            if ($bolds.length > 0) {
              quoteArray.push($bolds.html());
            } else {
              quoteArray.push($(this).html());
            }
          }
        });
        success({
          titles: result.parse.title,
          quotes: quoteArray,
          line: sectionIndex.line
        });
      },
      error: function(xhr, result, status) {
        error("Error getting quotes");
      }
    });
  }
};

const quoteController = function(title, success, error) {
  let line;
  API_URL = `https://${language}.wikiquote.org/w/api.php`;

  const errorFunction = msg => {
    error(msg);
  };

  const getSection = pageID => {
    wikiQuoteApi.getSectionsForPage(
      pageID,
      sections => getQuotes(pageID, sections),
      errorFunction
    );
  };
  const getQuotes = (pageID, sections) => {
    const randomSection = Math.floor(Math.random() * sections.sections.length);

    wikiQuoteApi.getQuoteForSection(
      pageID,
      sections.sections[randomSection],
      getQuote,
      errorFunction
    );
  };
  const getQuote = quoteArray => {
    const randomSection = Math.floor(Math.random() * quoteArray.quotes.length);
    success({
      title: quoteArray.titles,
      quote: quoteArray.quotes[randomSection],
      line: quoteArray.line
    });
  };

  wikiQuoteApi.openSearch(title, title => {
    if (!title[0]) {
      return errorFunction("No results");
    }
    wikiQuoteApi.getPageId(title[0], getSection, errorFunction);
  });
};
