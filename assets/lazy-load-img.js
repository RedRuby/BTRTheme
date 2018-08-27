;(function(global) {

  var SRC_ATTR = 'data-lazy-src'
  var BG_ATTR = 'data-lazy-bg'
  var DEFERRED_ATTR = 'data-wait'

  function queryAllToArray(query, root) {
    return [].slice.call(root.querySelectorAll(query))
  }

  function debounce(ms, fn) {
    var timer = null
    return function() {
      if (timer) return
      timer = setTimeout(function() {
        fn.apply(null, arguments)
        clearTimeout(timer)
        timer = null
      }, ms)
    }
  }

  function extend(a, b) {
    var c = {}
    for (var ak in a) c[ak] = a[ak]
    for (var bk in b) c[bk] = b[bk]
    return c
  }

  function loadImage(url, fn) {
    var img = new Image
    img.src = url
    img.onload = fn
  }

  function createBasePlaceholder(el) {
    return {
      el: el
    }
  }

  // data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20xmlns%3Axlink%3D%27http%3A//www.w3.org/1999/xlink%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cdefs%3E%3Csymbol%20id%3D%27a%27%20viewBox%3D%270%200%2090%2066%27%20opacity%3D%270.3%27%3E%3Cpath%20d%3D%27M85%205v56H5V5h80m5-5H0v66h90V0z%27/%3E%3Ccircle%20cx%3D%2718%27%20cy%3D%2720%27%20r%3D%276%27/%3E%3Cpath%20d%3D%27M56%2014L37%2039l-8-6-17%2023h67z%27/%3E%3C/symbol%3E%3C/defs%3E%3Cuse%20xlink%3Ahref%3D%27%23a%27%20width%3D%2720%25%27%20x%3D%2740%25%27/%3E%3C/svg%3E

  var iconSVG = "%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20xmlns%3Axlink%3D%27http%3A//www.w3.org/1999/xlink%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cdefs%3E%3Csymbol%20id%3D%27a%27%20viewBox%3D%270%200%2090%2066%27%20opacity%3D%270.3%27%3E%3Cpath%20d%3D%27M85%205v56H5V5h80m5-5H0v66h90V0z%27/%3E%3Ccircle%20cx%3D%2718%27%20cy%3D%2720%27%20r%3D%276%27/%3E%3Cpath%20d%3D%27M56%2014L37%2039l-8-6-17%2023h67z%27/%3E%3C/symbol%3E%3C/defs%3E%3Cuse%20xlink%3Ahref%3D%27%23a%27%20width%3D%2720%25%27%20x%3D%2740%25%27/%3E%3C/svg%3E"

  function createSrcPlaceholder(el) {

    // stick a placeholder on there for now
    if (el.getAttribute('data-lazy-custom-placeholder') !== 'true') el.setAttribute('src', "data:image/svg+xml;charset=utf-8," + iconSVG)

    return extend(createBasePlaceholder(el), {
      type: 'src',
      url: el.getAttribute(SRC_ATTR),
    })
  }

  function createBgPlaceholder(el) {
    if(el.style.backgroundImage == undefined) {
      // stick a placeholder on there for now
      el.style.backgroundImage = "url(data:image/svg+xml;charset=utf-8," + iconSVG + ")"
      el.style.backgroundRepeat = 'no-repeat'
      el.style.backgroundSize = 'contain'
      // el.style.backgroundImage = "url(data:image/svg+xml;base64," + iconSVG + ")"
    }

    return extend(createBasePlaceholder(el), {
      type: 'bg',
      url: el.getAttribute(BG_ATTR),
    })
  }

  function loadPlaceholder(ph) {
    switch (ph.type) {
      case 'src':
        loadImage(ph.url, function() {
          ph.el.setAttribute('src', ph.url)
          ph.el.removeAttribute(SRC_ATTR)
        })
        break
      case 'bg':
        loadImage(ph.url, function() {
          ph.el.style.backgroundRepeat = 'no-repeat'
          ph.el.style.backgroundSize = 'cover'
          ph.el.style.backgroundImage = 'url(' + ph.url + ')'
          ph.el.removeAttribute(BG_ATTR)
        })
        break
    }
  }

  function isVisible(el) {

    var rect = el.getBoundingClientRect()

    var isVisible = (rect.bottom >= 0) && (rect.top <= window.innerHeight) && (rect.right >= 0) && (rect.left <= window.innerWidth)

    return isVisible;
  }

  // LazyImage singleton
  global.LazyImage = {

    placeholders: [],

    bind: function() {

      var canUseObserver = typeof MutationObserver !== 'undefined'

      // detect obvious window movements
      window.addEventListener('scroll', debounce(200, LazyImage.testPlaceholders))
      window.addEventListener('resize', debounce(200, LazyImage.testPlaceholders))

      // start the steady drip of loading, so people don't need
      var interval = setInterval(function() {
        LazyImage.collectPlaceholders()
        if (!LazyImage.placeholders.length) return clearInterval(interval)
        LazyImage.testPlaceholders({ force: true, limit: 2 })
      }, 2000)

      // watch for DOM changes
      if (canUseObserver && false) {
        var mo = new MutationObserver(debounce(500, function(mutations) {
          LazyImage.run()
        }))
        mo.observe(document.body, { attributes: true, childList: true, subtree: true })
      } else {
//         console.warn('Dev note for LazyImage: In IE11, you must call LazyImage.run() after loading new content dynamically from AJAX or otherwise.')
      }
    },

    testPlaceholders: function(opts) {
      opts || (opts = {})
      LazyImage.placeholders = LazyImage.placeholders.filter(function(ph, i) {
        
        // allow for partial loading
        if (opts.limit && opts.limit <= i) return true

        if (opts.force || isVisible(ph.el)) {
          loadPlaceholder(ph)
          return false
        }

        return true
      })
    },

    collectPlaceholders: function() {

      var lazySrcs = queryAllToArray('[' + SRC_ATTR + ']', document)
      var lazyBgs = queryAllToArray('[' + BG_ATTR + ']', document)

      LazyImage.placeholders = []
        .concat(lazySrcs.map(createSrcPlaceholder))
        .concat(lazyBgs.map(createBgPlaceholder))
    },

    run: function() {
      LazyImage.collectPlaceholders()
      LazyImage.testPlaceholders()
    },

    initialize: function() {
      LazyImage.bind()
      LazyImage.collectPlaceholders()
      LazyImage.testPlaceholders()
    }
  }

  global.LazyImage.initialize()

})(window)