import { assert } from 'chai';
import Utils from "../src/common/background/utils";

describe("Utils", function () {
	describe("#getCapitalizedWordAtOffset()", function () {
		it("should find capitalized words at given offsets", function () {
			var content = "“We came to this tiny little screening room, with the most comfortable chairs I’ve ever sat in,” Mr. Bernstein said. “And Ethan kept saying, ‘Seymour, be patient — you’re going to dislike it when you see it, but give it a chance.’ Well, it started, and with the very first scene, I burst into tears — you can tell I cry a little too easily — and I said, ‘Ethan, my God, that’s fantastic.’ ”";
			assert.propertyVal(Utils.getCapitalizedWordAtOffset(content, content.indexOf("nstein")), "word", "Bernstein");
			assert.propertyVal(Utils.getCapitalizedWordAtOffset(content, content.indexOf("han kept saying")), "word", "Ethan");
			assert.propertyVal(Utils.getCapitalizedWordAtOffset(content, content.indexOf("r, be patient")), "word", "Seymour");
		});
		
		it("shouldn't find uncapitalized word", function () {
			var content = "Abc def ghijk";
			assert.isFalse(Utils.getCapitalizedWordAtOffset(content, content.indexOf("ef")));
		});
		
		it("shouldn't find word if space is on either side", function () {
			var content = "Abc Def Ghijk";
			assert.isFalse(Utils.getCapitalizedWordAtOffset(content, content.indexOf("Def")));
			assert.isFalse(Utils.getCapitalizedWordAtOffset(content, content.indexOf(" Ghi")));
		});
	});
	
	describe("#findTextInContext()", function () {
		// 0: Test title
		// 1: pageText
		// 2: searchTerms (string or array)
		// 3: expectedMatches (string or array; optional to match entire pageText)
		var tests = [
			[
				"Multiple sentences before and after",
				"Duis aute irure dolor. Lorem ipsum dolor sit amet. “Consectetur Adipiscing elit ‘Sed?’: Do eiusmod Tempor incididunt.” Ut labore et dolore.",
				"Tempor",
				"“Consectetur Adipiscing elit ‘Sed?’: Do eiusmod Tempor incididunt.”"
			],
			[
				"With no sentence after",
				"(Lorem ipsum dolor sit amet.) (Do eiusmod Tempor incididunt.)",
				"Tempor",
				"(Do eiusmod Tempor incididunt.)"
			],
			[
				"With sentence after",
				"(Lorem ipsum dolor sit amet.) (Do eiusmod Tempor incididunt.) Consectetur Adipiscing elit.",
				"Tempor",
				"(Do eiusmod Tempor incididunt.)"
			],
			[
				"Characters in middle of sentence",
				"(Lorem ipsum dolor sit amet.) (Do “eiusmod” Tempor incididunt.) Consectetur Adipiscing elit.",
				"Tempor",
				"(Do “eiusmod” Tempor incididunt.)"
			],
			[
				"Parenthesized sentence",
				"(Lorem ipsum dolor sit amet.) (Do (eiusmod) Tempor incididunt.) Consectetur Adipiscing elit.",
				"Tempor",
				"(Do (eiusmod) Tempor incididunt.)"
			],
			[
				"shouldn't stop at abbreviation if next word is lowercase",
				"Do eiusmod Tempor incididunt consectetur U.S. citizen. Elit lorem ipsum dolor sit amet.",
				"Tempor",
				"Do eiusmod Tempor incididunt consectetur U.S. citizen."
			],
			[
				"shouldn't stop at initial if followed by capital (selection before)",
				"Do eiusmod Tempor incididunt Consectetur J. Elit lorem ipsum dolor sit amet.",
				"Tempor",
				"Do eiusmod Tempor incididunt Consectetur J. Elit lorem ipsum dolor sit amet."
			],
			[
				"shouldn't stop at initial if followed by capital (selection after)",
				"Do eiusmod tempor incididunt Consectetur J. Elit lorem ipsum Dolor sit amet.",
				"Dolor",
				"Do eiusmod tempor incididunt Consectetur J. Elit lorem ipsum Dolor sit amet."
			],
			[
				"shouldn't stop at second initial if followed by capital (selection before)",
				"Do eiusmod Tempor incididunt C. J. Elit lorem ipsum dolor sit amet.",
				"Tempor"
			],
			[
				"shouldn't stop at second initial if followed by capital (selection after)",
				"Do eiusmod tempor incididunt C. J. Elit lorem ipsum Dolor sit amet.",
				"Dolor"
			],
			[
				// This may not be what we want, but let's document it
				"shouldn't stop at abbreviation if followed by quote and capital",
				"Do eiusmod Tempor incididunt consectetur U.S. “Elit lorem ipsum dolor sit amet.”",
				"Tempor",
				"Do eiusmod Tempor incididunt consectetur U.S. “Elit lorem ipsum dolor sit amet.”"
			],
			[
				"shouldn't stop at abbreviation if next word is a number",
				"Do eiusmod Tempor incididunt consectetur Jan. 25, 2010 lorem ipsum. Dolor sit amet.",
				"Tempor",
				"Do eiusmod Tempor incididunt consectetur Jan. 25, 2010 lorem ipsum."
			],
			[
				"shouldn't stop at middle initial",
				"Do eiusmod Tempor A. Incididunt consectetur elit lorem ipsum dolor sit amet.",
				"Incididunt",
				"Do eiusmod Tempor A. Incididunt consectetur elit lorem ipsum dolor sit amet."
			],
			[
				"should stop at newline after period",
				"Do eiusmod Tempor incididunt consectetur.\nElit: Lorem ipsum dolor sit amet.",
				"Elit",
				"Elit: Lorem ipsum dolor sit amet."
			],
			[
				"should stop at multiple newlines",
				"Do eiusmod Tempor incididunt consectetur\n\nElit lorem ipsum Dolor sit amet.",
				"Dolor",
				"Elit lorem ipsum Dolor sit amet."
			],
			[
				"should handle numeric citations inside period",
				"Do eiusmod Tempor incididunt consectetur[1]. Elit lorem ipsum Dolor sit amet[2]. Consectetur adipiscing elit.",
				"Dolor",
				"Elit lorem ipsum Dolor sit amet[2]."
			],
			[
				"should handle numeric citations outside period without space",
				"Do eiusmod Tempor incididunt consectetur.[1] Elit lorem ipsum Dolor sit amet.[2] Consectetur adipiscing elit.",
				"Dolor",
				"Elit lorem ipsum Dolor sit amet."
			],
			[
				"should handle numeric citations outside period with space",
				"Do eiusmod Tempor incididunt consectetur. [1] Elit lorem ipsum Dolor sit amet. [2] Consectetur adipiscing elit.",
				"Dolor",
				"Elit lorem ipsum Dolor sit amet."
			],
			[
				"should stop before article location (NYT)",
				"By TEMPOR INCIDIDUNTJUNE 24, 2016\n\nLONDON — Lorem ipsum Dolor sit amet.",
				"Dolor",
				// Debatable, but fine
				"LONDON — Lorem ipsum Dolor sit amet."
			],
			
			
			//
			// Examples adapted from http://tech.grammarly.com/blog/posts/How-to-Split-Sentences.html"
			//
			[
				"Small letter after dot, no split",
				"At some schools, even professionals boasting Ph.D. degrees are coming back to school for Master's degrees.",
				["coming", "Master"]
			],
			/*[
				"Small letter after dot, split (manual mistakes/informal text)",
				"If Harvard doesn't come through, I 'll take the test to get into Yale. many parents set goals for their children, or maybe they don't set a goal.",
			],*/
			/*[
				"Names after abbreviation, no split",
				"He adds, in a far less amused tone, that the government has been talking about making Mt. Kuanyin a national park for a long time, and has banned construction or use of the mountain.",
				["Kuanyin", "construction"]
			],
			[
				"Names after abbreviation, split",
				"The luxury auto maker last year sold 1,214 cars in the U.S. Howard Mosher, president and chief executive officer, said he anticipates growth for the luxury auto maker in Britain and Europe, and in Far Eastern markets.",
				["Mosher", "Europe"],
				"Howard Mosher, president and chief executive officer, said he anticipates growth for the luxury auto maker in Britain and Europe, and in Far Eastern markets."
			],*/
			/*[
				"Ellipsis, split",
				'No, to my mind, the Journal did not "defend sleaze, fraud, waste, embezzlement, influence-peddling and abuse of the public trust..." it defended appropriate constitutional safeguards and practical common sense."
			],
			[
				"Ellipsis, no split",
				"After seeing the list of what would not be open and/or on duty... which I'm also quite sure is not complete... I 'll go out on a limb.... and predict... that this will not happen."
			],*/
			[
				"Initials, no split",
				"Bharat Ratna Avul Pakir Jainulabdeen Abdul Kalam is also called as Dr. A.P.J Abdul Kalam.",
				"Kalam"
			],
			/*[
				"Looks like initials, split",
				"The agency said it confirmed American Continental's preferred stock rating at C. American Continental's thrift unit, Los Angeles-based Lincoln Savings & Loan Association, is in receivership and the parent company has filed for protection from creditor lawsuits under Chapter 11 of the federal Bankruptcy Code.",
				"Bankruptcy",
				"American Continental's thrift unit, Los Angeles-based Lincoln Savings & Loan Association, is in receivership and the parent company has filed for protection from creditor lawsuits under Chapter 11 of the federal Bankruptcy Code."
			],*/
			[
				"Quotes, split",
				'Wang first asked: "Are you sure you want the original inscription ground off?" Without thinking twice about it, Huang said yes.',
				"Huang",
				"Without thinking twice about it, Huang said yes."
			],
			/*[
				"Quotes, no split",
				"\"It's too much, there's only us two, how are we going to eat this?\" I asked young Zhao as I looked at him in surprise.",
				"Zhao"
			],*/
			/*[
				"Nonstandard sentence ends (parentheses)",
				"The JW considers itself THE kingdom of God on earth. ('Kindom Hall') So it is only to be expected that they do not see a reason to run to and report everything to the government.",
				"everything",
				"So it is only to be expected that they do not see a reason to run to and report everything to the government."
			],*/
			[
				"URL",
				"Consectetur adipiscing elit Foo. http://example.com/blog. Elit lorem ipsum Dolor sit amet.",
				"Dolor",
				"Elit lorem ipsum Dolor sit amet."
			],
			
			[
				"em dash after quotes",
				"Foo Bar, who writes a blog about “behavioral design” — the intersection of psychology, technology and business — said he habitually turned to campaign coverage to momentarily distract him from his work and escape from “an uncomfortable reality.”",
				"Bar"
			],
			
			[
				"number after quotes",
				"Maj. Scott Crogg, F-16 pilot, call-sign “Hooter,” 111th Fighter Squadron, Houston: I had just gotten off alert at Ellington Field [in Houston], normally we pull 24-hour alerts, mostly for drug interdiction.",
				"Crogg"
			],
			
			[
				"shouldn't match substring",
				"Time eiusmod tempor incididunt consectetur U.S. citizen. Consectetur adipiscing Tim elit sed. Elit lorem ipsum dolor Tim sit amet.",
				"Tim",
				"Consectetur adipiscing Tim elit sed."
			],
		];
		
		for (let test of tests) {
			let title = test[0];
			let pageText = test[1];
			
			let searchTerms = test[2];
			if (typeof searchTerms == 'string') {
				searchTerms = [searchTerms];
			}
			
			let expectedMatches = test[3];
			if (!expectedMatches) {
				expectedMatches = [pageText];
			}
			if (typeof expectedMatches == 'string') {
				expectedMatches = [expectedMatches];
			}
			
			for (let searchTerm of searchTerms) {
				let prefix = title.startsWith('should') ? "" : "-- ";
				it(prefix + title, function () {
					var match = Utils.findTextInContext(searchTerm, pageText);
					assert.lengthOf(match, expectedMatches.length, "'" + searchTerm + "' should find " + expectedMatches.length + " matches");
					assert.equal(JSON.stringify(match), JSON.stringify(expectedMatches), "'" + searchTerm + "' should produce expected matches");
				});
			}
		}
	});
	
	it("should include search word and text after if first occurrence is in the same sentence", function () {
		var searchTerm = "Incididunt";
		var pageText = "Duis Aute irure dolor Auis. Lorem Tempor-Incididunt sit amet Tempor-";
		var afterText = " consectetur.";
		var match = Utils.findTextInContext(searchTerm, pageText, afterText);
		assert.equal(match[0], "Lorem Tempor-Incididunt sit amet Tempor-Incididunt consectetur.");
	});
	
	it("should include search word at ending if first occurrence is in the same sentence", function () {
		var searchTerm = "Aute";
		var pageText = "Duis Aute irure dolor ";
		var afterText = ". Lorem Tempor-Incididunt sit amet Tempor-Incididunt consectetur.";
		var match = Utils.findTextInContext(searchTerm, pageText, afterText);
		assert.equal(match[0], "Duis Aute irure dolor Aute.");
	});
});
