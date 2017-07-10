# webextension-extract-json

Browser action which shows JSON data found in PRE elements on the current page.

# TODO

- Use polyfill (https://github.com/mozilla/webextension-polyfill) and support both Firefox and Chrome
- Better icon
- Settings with:
	- selector for "source" elements (currently only PRE elements are checked)
	- instead of a single "excerpt", allow creating "excerpt" and "title" through
	  user-defined funtions
- Make inspecting asynchronous, because right now, all JSON data found is parsed
  (to validate) and excerpts are created in a single run, which may be a bit slow
  when there's a lot of data
