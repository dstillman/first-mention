import jsdom from 'jsdom';
import { assert } from 'chai';
import browserify from 'browserify';
import babelify from 'babelify';
import sinon from 'sinon';

var virtualConsole = jsdom.createVirtualConsole().sendTo(console);
var contentUtilsSrc;

describe("ContentUtils", function () {
	var lorem1 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
	var lorem2 = "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
	
	before(function (done) {
		var b = browserify({
			standalone: "ContentUtils"
		});
		b.add("./src/common/content/contentUtils");
		b.transform(babelify);
		b.bundle(function (err, buf) {
			if (err) {
				throw err;
			}
			contentUtilsSrc = buf.toString('utf-8');
			done();
		});
	});
	
	describe("#extractPageTextBeforeNodeAndOffset()", function () {
		function extract(html, nodeGetter, offset, expected, done) {
			jsdom.env({
				html,
				src: [contentUtilsSrc],
				virtualConsole,
				done: function (err, window) {
					// offsetParent doesn't work in jsdom
					// https://github.com/tmpvar/jsdom/issues/1261
					var stub = sinon.stub(window.ContentUtils.default, "elementIsVisible").returns(true);
					
					var text = window.ContentUtils.default.extractPageTextBeforeNodeAndOffset(
						nodeGetter(window), offset
					);
					
					stub.restore();
					
					assert.equal(text, expected);
					done();
				}
			});
		}
		
		it("should ignore divs if target is in within paragraph", function (done) {
			extract(
				'<p>A B C D</p>'
					// Ignore
					+ `<div>${lorem1}</div>`
					+ '<p id="target">E <span><a href="http://example.com/"><span>F</span></a></span>, G H</p>',
				win => win.document.getElementById('target').childNodes[2],
				4,
				"A B C D\n\nE F, G ",
				done
			);
		});
		
		it("should ignore divs if a paragraph is found", function (done) {
			extract(
				// Ignore
				`<div>${lorem1}</div>`
					+ '<p>A B C D</p>'
					// Include
					+ `<div>${lorem2}</div>`
					+ '<div id="target">E F G H</div>',
				win => win.document.getElementById('target').childNodes[0],
				6,
				`A B C D\n\n${lorem2}\n\nE F G `,
				done
			);
		});
		
		it("should include previous text within nested elements", function (done) {
			extract(
				'<div><p>A <a href="http://example.com/">B</a>, C D</p></div>'
					+ '<p id="target">E <span><a href="http://example.com/"><span>F</span></a></span>, G H</p>',
				win => win.document.getElementById('target').childNodes[2],
				4,
				"A B, C D\n\nE F, G ",
				done
			);
		});
		
		it("should handle nested clicked text", function (done) {
			extract(
				'<p>A B C D</p>'
					+ '<p>E <a href="http://example.com/">F</a>, <span id="target">G</span> H</p>',
				win => win.document.getElementById('target').firstChild,
				0,
				"A B C D\n\nE F, ",
				done
			);
		});
		
		it("shouldn't include content twice if two divs are nested", function (done) {
			extract(
				`<div>${lorem1}<div>E F <span id="target">G</span> H</div></div>`,
				win => win.document.getElementById('target').firstChild,
				0,
				`${lorem1}\n\nE F `,
				done
			);
		});
		
		it("should skip script content", function (done) {
			extract(
				'<p><script>var a = 1;</script>A B C D</p>'
					+ '<p><script>var a = 1;</script>E <a href="http://example.com/">F</a>, <span id="target">G</span> H</p>',
				win => win.document.getElementById('target').firstChild,
				0,
				"A B C D\n\nE F, ",
				done
			);
		});
		
		it("should ignore text in <aside>", function (done) {
			extract(
				'<p>A</p>'
					+ '<p>B</p>'
					+ '<aside><p>C</p></aside>'
					+ '<p>D</p>'
					+ '<p id="target">E</p>',
				win => win.document.getElementById('target').firstChild,
				0,
				"A\n\nB\n\nD\n\n",
				done
			);
		});
		
		it("should add newline for <br>", function (done) {
			extract(
				'<p><span>Foo by</span> <strong>A B<br></strong><span>Bar by</span>&nbsp;<strong><strong>C D<br></strong></strong><span>Qux by</span><strong> E F</strong>&nbsp;&nbsp;</p>'
					+ '<p id="target">A</p>',
				win => win.document.getElementById('target').firstChild,
				0,
				"Foo by A B\nBar by C D\nQux by E F  \n\n",
				done
			);
		});
	});
	
	
	describe("#isClickableNode()", function () {
		function click(html, expected, done) {
			jsdom.env({
				html,
				src: [contentUtilsSrc],
				virtualConsole,
				done: function (err, window) {
					var actual = window.ContentUtils.default.isClickableNode(
						window.document.getElementById('target').firstChild
					);
					assert.equal(actual, expected);
					done();
				}
			});
		}
		
		it("should accept paragraph", function (done) {
			click(
				'<p id="target">A</p>',
				true,
				done
			);
		});
		
		it("should ignore div ancestor without content", function (done) {
			click(
				'<div>'
					+ '<div id="target">A</div>'
					+ '</div>',
				false,
				done
			);
		});
		
		it("should accept div with content", function (done) {
			click(
				'<div id="target">'
					+ lorem1
					+ '</div>',
				true,
				done
			);
		});
		
		it("should accept div ancestor with content", function (done) {
			click(
				'<div>'
					+ lorem1
					+ '<span id="target">A</span>'
					+ '</div>',
				true,
				done
			);
		});
	});
	
	
	describe("#isTextContainer()", function () {
		function test(html, expected, done) {
			jsdom.env({
				html,
				src: [contentUtilsSrc],
				virtualConsole,
				done: function (err, window) {
					console.log(window.document.body.firstChild.outerHTML);
					var actual = window.ContentUtils.default.isTextContainer(
						window.document.body.firstChild
					);
					assert.equal(actual, expected);
					done();
				}
			});
		}
		
		it("should return true for div with >90 characters of direct content", function (done) {
			test(
				'<div>'
					+ lorem1.substr(0, 50)
					+ '<span>' + lorem1.substr(0, 10) + '</span>'
					+ lorem1.substr(0, 50)
					+ '</div>',
				true,
				done
			);
		});
		
		it("should return false for div with whitespace", function (done) {
			test(
				'<div>'
					+ ' '.repeat(100)
					+ '</div>',
				false,
				done
			);
		});
	});
});
