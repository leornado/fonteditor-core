/**
 * @file ttf2eot
 * @author mengke01(kekee000@gmail.com)
 */
import assert from 'assert';
import {readData} from '../data';
import TTFReader from 'fonteditor-core/ttf/ttfreader';
import ttf2eot from 'fonteditor-core/ttf/ttf2eot';
import eot2ttf from 'fonteditor-core/ttf/eot2ttf';

describe('ttf 转 eot', function () {

    let eotBuffer = ttf2eot(readData('baiduHealth.ttf'));

    it('test eot format', function () {
        assert.ok(eotBuffer.byteLength > 1000);
        assert.ok(eotBuffer.byteLength < 10000);
    });

    it('test read eot', function () {
        let ttf = new TTFReader().read(eot2ttf(eotBuffer));

        assert.equal(ttf.version, 1);

        assert.equal(ttf.head.magickNumber, 1594834165);
        assert.equal(ttf.head.unitsPerEm, 512);

        assert.equal(ttf.post.format, 2);
        assert.equal(ttf.post.underlinePosition, 0);
        assert.equal(ttf.post.underlineThickness, 0);

        assert.equal(ttf.hhea.advanceWidthMax, 682);
        assert.equal(ttf.hhea.ascent, 480);
        assert.equal(ttf.hhea.descent, -33);

        assert.equal(ttf.maxp.version, 1);
        assert.equal(ttf.maxp.numGlyphs, 17);

        assert.equal(ttf.glyf[0].advanceWidth, 512);
        assert.equal(ttf.glyf[0].leftSideBearing, 0);
        assert.equal(ttf.glyf[0].name, '.notdef');
        assert.equal(ttf.glyf[3].contours[0].length, 31);
        assert.equal(ttf.glyf[16].compound, true);
        assert.equal(ttf.glyf[16].glyfs.length, 2);

        assert.equal(ttf.cmap[0], 1);
        assert.equal(ttf.cmap[57400], 16);
    });
});
