import '@ostro/support/helpers';
import AbstractPaginator from '../src/abstractPaginator';
import LengthAwarePaginator from '../src/lengthAwarePaginator';
import Paginator from '../src/paginator';
import UrlWindow from '../src/urlWindow';
import Collection from '@ostro/support/collection';

describe('@ostro/pagination', () => {
    let mockViewFactory;
    let mockMake;

    beforeEach(() => {
        mockMake = jest.fn((view, data) => `rendered:${view}`);
        mockViewFactory = {
            make: mockMake
        };
        AbstractPaginator.viewFactoryResolver(() => mockViewFactory);
        AbstractPaginator.useTailwind();
    });

    afterEach(() => {
        AbstractPaginator.$viewFactoryResolver = null;
        AbstractPaginator.useTailwind();
    });

    describe('AbstractPaginator', () => {
        class TestPaginator extends AbstractPaginator {
            constructor(items = [], perPage = 10, currentPage = 1) {
                super();
                this.$items = items instanceof Collection ? items : Collection.make(items);
                this.$perPage = perPage;
                this.$currentPage = currentPage;
            }

            hasMorePages() {
                return true;
            }
        }

        test('isValidPageNumber', () => {
            const p = new TestPaginator();
            expect(p.isValidPageNumber(1)).toBe(true);
            expect(p.isValidPageNumber('2')).toBe(true);
            expect(p.isValidPageNumber(0)).toBe(false);
            expect(p.isValidPageNumber(-1)).toBe(false);
            expect(p.isValidPageNumber('abc')).toBe(false);
        });

        test('previousPageUrl', () => {
            const p = new TestPaginator([], 10, 2);
            expect(p.previousPageUrl()).toBe('/?page=1');

            const p1 = new TestPaginator([], 10, 1);
            expect(p1.previousPageUrl()).toBeUndefined();
        });

        test('getUrlRange', () => {
            const p = new TestPaginator([], 10, 1);
            const range = p.getUrlRange(1, 3);
            expect(range).toEqual({
                1: '/?page=1',
                2: '/?page=2',
                3: '/?page=3'
            });
        });

        test('url with page <= 0, query params, existing path query and fragment', () => {
            const p = new TestPaginator([], 10, 1);
            expect(p.url(0)).toBe('/?page=1');
            expect(p.url(-5)).toBe('/?page=1');

            // with query
            p.appends('sort', 'desc');
            expect(p.url(2)).toBe('/?page=2&sort=desc');

            // with path containing '?'
            p.setPath('/search?type=posts');
            expect(p.url(3)).toBe('/search?type=posts&page=3&sort=desc');

            // with fragment
            p.fragment('section1');
            expect(p.fragment()).toBe('section1');
            expect(p.url(3)).toBe('/search?type=posts&page=3&sort=desc#section1');
        });

        test('appends with null, object, and key-value', () => {
            const p = new TestPaginator([], 10, 1);
            expect(p.appends(null)).toBe(p);

            p.appends({ filter: 'active', order: 'asc' });
            expect(p.$query).toEqual({ filter: 'active', order: 'asc' });

            p.appends('page', 99); // $pageName should not be added to $query
            expect(p.$query.page).toBeUndefined();

            p.appends('tag', 'news');
            expect(p.$query.tag).toBe('news');
        });

        test('withQueryString resolves query string from request', () => {
            const p = new TestPaginator([], 10, 1);
            p.$request = {
                getQuery: () => ({ search: 'hello', category: 'tech' })
            };
            p.withQueryString();
            expect(p.$query).toEqual({ search: 'hello', category: 'tech' });
        });

        test('loadMorph and loadMorphCount delegate to collection', () => {
            const mockCollection = {
                loadMorph: jest.fn(),
                loadMorphCount: jest.fn()
            };
            const p = new TestPaginator();
            p.$items = mockCollection;

            p.loadMorph('relation', 'relations');
            expect(mockCollection.loadMorph).toHaveBeenCalledWith('relation', 'relations');

            p.loadMorphCount('relation', 'relations');
            expect(mockCollection.loadMorphCount).toHaveBeenCalledWith('relation', 'relations');
        });

        test('items, firstItem, lastItem, through', () => {
            const p = new TestPaginator(['a', 'b', 'c'], 2, 2);
            expect(p.items()).toEqual(['a', 'b', 'c']);
            expect(p.firstItem()).toBe(3); // (2-1)*2 + 1 = 3
            expect(p.lastItem()).toBe(5);  // 3 + 3 - 1 = 5

            p.through(item => item.toUpperCase());
            expect(p.items()).toEqual(['A', 'B', 'C']);

            // Empty items
            const emptyP = new TestPaginator([], 2, 1);
            expect(emptyP.firstItem()).toBeNull();
            expect(emptyP.lastItem()).toBeNull();
        });

        test('perPage, hasPages, onFirstPage, onLastPage, currentPage', () => {
            const p = new TestPaginator(['a'], 10, 1);
            expect(p.perPage()).toBe(10);
            expect(p.currentPage()).toBe(1);
            expect(p.onFirstPage()).toBe(true);
            expect(p.hasPages()).toBe(true); // currentPage == 1 but hasMorePages() == true
            expect(p.onLastPage()).toBe(false);

            // page 2
            const p2 = new TestPaginator(['a'], 10, 2);
            expect(p2.onFirstPage()).toBe(false);

            // when hasMorePages() is false
            p2.hasMorePages = () => false;
            expect(p2.onLastPage()).toBe(true);

            // hasPages false when page 1 and no more pages
            const pSingle = new TestPaginator(['a'], 10, 1);
            pSingle.hasMorePages = () => false;
            expect(pSingle.hasPages()).toBe(false);
        });

        test('pageName, path, onEachSide', () => {
            const p = new TestPaginator();
            expect(p.getPageName()).toBe('page');
            p.setPageName('custom_page');
            expect(p.getPageName()).toBe('custom_page');

            p.withPath('/custom/path');
            expect(p.path()).toBe('/custom/path');

            p.onEachSide(5);
            expect(p.$onEachSide).toBe(5);
        });

        test('resolveCurrentPath, resolveCurrentPage, resolveQueryString', () => {
            const p = new TestPaginator();
            expect(p.resolveCurrentPath()).toBe('/');
            expect(p.resolveCurrentPath('/default')).toBe('/default');
            expect(p.resolveCurrentPage('page', 1)).toBe(1);
            expect(p.resolveQueryString(null)).toBeNull();

            // with request
            p.$request = {
                url: () => 'https://example.com/items',
                input: (k) => (k === 'p' ? '3' : null),
                getQuery: () => ({ sort: 'asc' })
            };
            expect(p.resolveCurrentPath()).toBe('https://example.com/items');
            expect(p.resolveCurrentPage('p', 1)).toBe(3);
            expect(p.resolveCurrentPage('missing', 1)).toBe(1);
            expect(p.resolveQueryString()).toEqual({ sort: 'asc' });

            // request.url as a string
            p.$request = {
                url: 'https://example.com/string-url'
            };
            expect(p.resolveCurrentPath()).toBe('https://example.com/string-url');

            // request.path as a function
            p.$request = {
                path: () => '/path-function'
            };
            expect(p.resolveCurrentPath()).toBe('/path-function');

            // request with neither url nor path
            p.$request = {};
            expect(p.resolveCurrentPath('/fallback')).toBe('/fallback');

            // invalid page number in input
            p.$request = {
                input: () => 'not_a_number'
            };
            expect(p.resolveCurrentPage('p', 1)).toBe(1);
        });

        test('static view configurations and themes', () => {
            expect(AbstractPaginator.viewFactory()).toBe(mockViewFactory);

            AbstractPaginator.defaultView('custom::view');
            expect(AbstractPaginator.$defaultView).toBe('custom::view');

            AbstractPaginator.defaultSimpleView('custom::simple');
            expect(AbstractPaginator.$defaultSimpleView).toBe('custom::simple');

            AbstractPaginator.useTailwind();
            expect(AbstractPaginator.$defaultView).toBe('pagination::tailwind');
            expect(AbstractPaginator.$defaultSimpleView).toBe('pagination::simple-tailwind');

            AbstractPaginator.useBootstrap();
            expect(AbstractPaginator.$defaultView).toBe('pagination::bootstrap-4');
            expect(AbstractPaginator.$defaultSimpleView).toBe('pagination::simple-bootstrap-4');

            AbstractPaginator.useBootstrapThree();
            expect(AbstractPaginator.$defaultView).toBe('pagination::default');
            expect(AbstractPaginator.$defaultSimpleView).toBe('pagination::simple-default');

            AbstractPaginator.useBootstrapFour();
            expect(AbstractPaginator.$defaultView).toBe('pagination::bootstrap-4');
            expect(AbstractPaginator.$defaultSimpleView).toBe('pagination::simple-bootstrap-4');

            AbstractPaginator.useBootstrapFive();
            expect(AbstractPaginator.$defaultView).toBe('pagination::bootstrap-5');
            expect(AbstractPaginator.$defaultSimpleView).toBe('pagination::simple-bootstrap-5');
        });

        test('collection methods, ArrayAccess / offset methods, options', () => {
            const p = new TestPaginator(['first', 'second']);
            expect(p.count()).toBe(2);
            expect(p.isEmpty()).toBe(false);
            expect(p.isNotEmpty()).toBe(true);
            expect(p.getIterator()).toBeDefined();

            // test appendObject with default parameter
            p.appendObject();

            // offsetGet when items has get method returning non-collection or raw object
            const pRaw = new TestPaginator();
            pRaw.$items = {
                get: (k) => 'raw_val',
                has: () => true
            };
            expect(pRaw.offsetGet('k')).toBe('raw_val');

            p.setCollection(new Collection(['x', 'y']));
            expect(p.items()).toEqual(['x', 'y']);

            p.$options = { optKey: 'optVal' };
            expect(p.getOptions()).toEqual({ optKey: 'optVal' });

            // offset methods
            expect(p.offsetExists(0)).toBe(true);
            expect(p.offsetExists(99)).toBe(false);
            expect(p.offsetGet(0)).toBe('x');
            p.offsetSet(2, 'z');
            expect(p.offsetGet(2)).toBe('z');
            p.offsetUnset(2);
            expect(p.offsetExists(2)).toBe(false);

            // offsetUnset with non-array items
            const pObj = new TestPaginator();
            pObj.$items = { foo: 'bar' };
            pObj.offsetUnset('foo');
            expect(pObj.$items.foo).toBeUndefined();

            // getIterator when getIterator is a function on items
            const mockItemsWithIterator = {
                getIterator: jest.fn(() => ['custom_iter']),
                count: () => 1
            };
            const pIter = new TestPaginator();
            pIter.$items = mockItemsWithIterator;
            expect(pIter.getIterator()).toEqual(['custom_iter']);
            expect(mockItemsWithIterator.getIterator).toHaveBeenCalled();

            // __call proxy to collection
            expect(p.first()).toBe('x');
            expect(p.last()).toBe('y');

            // toHtml and __toString
            p.render = () => 'rendered_html';
            expect(p.toHtml()).toBe('rendered_html');
            expect(p.__toString()).toBe('rendered_html');
        });
    });

    describe('LengthAwarePaginator', () => {
        test('constructor with defaults and options', () => {
            const lap = new LengthAwarePaginator(['a', 'b'], 20, 10, 1, {
                $path: '/custom-path/'
            });

            expect(lap.total()).toBe(20);
            expect(lap.perPage()).toBe(10);
            expect(lap.lastPage()).toBe(2);
            expect(lap.path()).toBe('/custom-path');
            expect(lap.currentPage()).toBe(1);
            expect(lap.items()).toEqual(['a', 'b']);

            // Collection instance and default parameters
            const col = new Collection(['x', 'y']);
            const lapDefault = new LengthAwarePaginator(col, 20, 10);
            expect(lapDefault.items()).toEqual(['x', 'y']);
            expect(lapDefault.path()).toBe('/');
            expect(lapDefault.currentPage()).toBe(1);
        });

        test('constructor when currentPage is null resolves from request or default', () => {
            const lap = new LengthAwarePaginator(['a'], 10, 5, null, {}, {
                input: (name) => '2'
            });
            expect(lap.currentPage()).toBe(2);

            // invalid page defaults to 1
            const lapInvalid = new LengthAwarePaginator(['a'], 10, 5, null, {}, {
                input: (name) => 'invalid'
            });
            expect(lapInvalid.currentPage()).toBe(1);

            // negative page number
            const lapNeg = new LengthAwarePaginator(['a'], 10, 5, null, {}, {
                input: (name) => '-5'
            });
            expect(lapNeg.currentPage()).toBe(1);

            // explicit invalid page passed to setCurrentPage
            expect(lap.setCurrentPage('not-a-number')).toBe(1);
        });

        test('render and links methods', () => {
            const lap = new LengthAwarePaginator(['a'], 10, 5, 1);
            const rendered = lap.links();
            expect(mockMake).toHaveBeenCalledWith('pagination::tailwind', expect.objectContaining({
                paginator: lap
            }));
            expect(rendered).toBe('rendered:pagination::tailwind');

            const renderedCustom = lap.render('custom::view', { foo: 'bar' });
            expect(mockMake).toHaveBeenCalledWith('custom::view', expect.objectContaining({
                paginator: lap,
                foo: 'bar'
            }));
            expect(renderedCustom).toBe('rendered:custom::view');

            // links and render without arguments
            lap.links();
            lap.render();
        });

        test('hasMorePages, nextPageUrl, nextPage', () => {
            const lap = new LengthAwarePaginator(['a'], 20, 10, 1);
            expect(lap.hasMorePages()).toBe(true);
            expect(lap.nextPage()).toBe(2);
            expect(lap.nextPageUrl()).toBe('/?page=2');

            const lapLast = new LengthAwarePaginator(['a'], 20, 10, 2);
            expect(lapLast.hasMorePages()).toBe(false);
            expect(lapLast.nextPage()).toBeUndefined();
            expect(lapLast.nextPageUrl()).toBeUndefined();
        });

        test('linkCollection and elements', () => {
            // Short pagination (small slider)
            const lap = new LengthAwarePaginator(['a', 'b'], 30, 10, 2);
            const links = lap.linkCollection().toArray();
            expect(links[0].label).toBe('Previous');
            expect(links[0].url).toBe('/?page=1');
            expect(links[links.length - 1].label).toBe('Next');
            expect(links[links.length - 1].url).toBe('/?page=3');

            // Elements with slider containing '...'
            const lapBig = new LengthAwarePaginator(['a'], 200, 10, 10);
            lapBig.onEachSide(1);
            const elements = lapBig.elements();
            expect(elements).toContain('...');
            const bigLinks = lapBig.linkCollection().toArray();
            const ellipsisLink = bigLinks.find(l => l.label === '...');
            expect(ellipsisLink).toBeDefined();
            expect(ellipsisLink.url).toBeNull();
        });

        test('toJson, toJSON, jsonSerialize', () => {
            const lap = new LengthAwarePaginator(['a', 'b'], 20, 10, 1);
            const json = lap.toJson();
            expect(json).toHaveProperty('current_page', 1);
            expect(json).toHaveProperty('data', ['a', 'b']);
            expect(json).toHaveProperty('first_page_url', '/?page=1');
            expect(json).toHaveProperty('from', 1);
            expect(json).toHaveProperty('last_page', 2);
            expect(json).toHaveProperty('last_page_url', '/?page=2');
            expect(json).toHaveProperty('links');
            expect(json).toHaveProperty('next_page_url', '/?page=2');
            expect(json).toHaveProperty('path', '/');
            expect(json).toHaveProperty('per_page', 10);
            expect(json).toHaveProperty('prev_page_url', undefined);
            expect(json).toHaveProperty('to', 2);
            expect(json).toHaveProperty('total', 20);

            expect(lap.toJSON()).toEqual(json);
            expect(lap.jsonSerialize()).toEqual(json);
        });
    });

    describe('Paginator (Simple Paginator)', () => {
        test('constructor with items slicing and hasMore detection', () => {
            // When items.count() > perPage
            const p = new Paginator(['a', 'b', 'c'], 2, 1, {
                $path: '/my-path/'
            });

            expect(p.perPage()).toBe(2);
            expect(p.currentPage()).toBe(1);
            expect(p.items()).toEqual(['a', 'b']);
            expect(p.hasMorePages()).toBe(true);
            expect(p.path()).toBe('/my-path');

            // When items.count() <= perPage
            const p2 = new Paginator(['a', 'b'], 2, 1);
            expect(p2.items()).toEqual(['a', 'b']);
            expect(p2.hasMorePages()).toBe(false);

            // Collection instance and default parameters
            const col = new Collection(['x']);
            const pDefault = new Paginator(col, 5);
            expect(pDefault.items()).toEqual(['x']);
            expect(pDefault.path()).toBe('/');
            expect(pDefault.currentPage()).toBe(1);
        });

        test('setCurrentPage with null resolves current page', () => {
            const p = new Paginator(['a'], 5, null, {}, {
                input: () => '3'
            });
            expect(p.currentPage()).toBe(3);

            const pInvalid = new Paginator(['a'], 5, null, {}, {
                input: () => 'xyz'
            });
            expect(pInvalid.currentPage()).toBe(1);

            const pNeg = new Paginator(['a'], 5, null, {}, {
                input: () => '-1'
            });
            expect(pNeg.currentPage()).toBe(1);

            // explicit invalid page passed to setCurrentPage
            expect(p.setCurrentPage('not-a-number')).toBe(1);
        });

        test('nextPage and nextPageUrl', () => {
            const p = new Paginator(['a', 'b', 'c'], 2, 1);
            expect(p.hasMorePages()).toBe(true);
            expect(p.nextPage()).toBe(2);
            expect(p.nextPageUrl()).toBe('/?page=2');

            p.hasMorePagesWhen(false);
            expect(p.hasMorePages()).toBe(false);
            expect(p.nextPage()).toBeUndefined();
            expect(p.nextPageUrl()).toBeUndefined();
        });

        test('links and render methods', () => {
            const p = new Paginator(['a'], 5, 1);
            const rendered = p.links();
            expect(mockMake).toHaveBeenCalledWith('pagination::simple-tailwind', expect.objectContaining({
                paginator: p
            }));
            expect(rendered).toBe('rendered:pagination::simple-tailwind');

            const renderedCustom = p.render('custom::simple-view', { custom: 123 });
            expect(mockMake).toHaveBeenCalledWith('custom::simple-view', expect.objectContaining({
                paginator: p,
                custom: 123
            }));
            expect(renderedCustom).toBe('rendered:custom::simple-view');

            // links and render without arguments
            p.links();
            p.render();

            // hasMorePagesWhen default parameter
            p.hasMorePagesWhen();
            expect(p.hasMorePages()).toBe(true);
        });

        test('toJson and jsonSerialize', () => {
            const p = new Paginator(['a', 'b', 'c'], 2, 2);
            const json = p.toJson();
            expect(json).toHaveProperty('current_page', 2);
            expect(json).toHaveProperty('data', ['a', 'b']);
            expect(json).toHaveProperty('first_page_url', '/?page=1');
            expect(json).toHaveProperty('from', 3);
            expect(json).toHaveProperty('next_page_url', '/?page=3');
            expect(json).toHaveProperty('path', '/');
            expect(json).toHaveProperty('per_page', 2);
            expect(json).toHaveProperty('prev_page_url', '/?page=1');
            expect(json).toHaveProperty('to', 4);

            expect(p.jsonSerialize()).toEqual(json);
        });
    });

    describe('UrlWindow', () => {
        test('small slider when total pages < (onEachSide * 2) + 8', () => {
            // onEachSide = 3 -> (3 * 2) + 8 = 14
            const paginator = new LengthAwarePaginator([], 50, 10, 1); // 5 pages < 14
            const window = UrlWindow.make(paginator);
            expect(window.first).toEqual({
                1: '/?page=1',
                2: '/?page=2',
                3: '/?page=3',
                4: '/?page=4',
                5: '/?page=5'
            });
            expect(window.slider).toBeNull();
            expect(window.last).toBeNull();
        });

        test('slider when not having pages (lastPage <= 1)', () => {
            const paginator = new LengthAwarePaginator([], 10, 10, 1); // lastPage = 1
            const uw = new UrlWindow(paginator);
            const slider = uw.getUrlSlider(3);
            expect(slider).toEqual({ first: null, slider: null, last: null });
        });

        test('slider too close to beginning: currentPage <= window', () => {
            // onEachSide = 3, window = 7. 200 total, 10 perPage = 20 pages
            const paginator = new LengthAwarePaginator([], 200, 10, 4); // currentPage 4 <= 7
            const window = UrlWindow.make(paginator);
            // first: 1 to (7 + 3) = 10
            expect(window.first).toBeDefined();
            expect(Object.keys(window.first).length).toBe(10);
            expect(window.slider).toBeNull();
            expect(window.last).toEqual({
                19: '/?page=19',
                20: '/?page=20'
            });
        });

        test('slider too close to ending: currentPage > (lastPage - window)', () => {
            // onEachSide = 3, window = 7. 20 pages. lastPage - window = 13.
            const paginator = new LengthAwarePaginator([], 200, 10, 17); // currentPage 17 > 13
            const window = UrlWindow.make(paginator);
            expect(window.first).toEqual({
                1: '/?page=1',
                2: '/?page=2'
            });
            expect(window.slider).toBeNull();
            expect(window.last).toBeDefined();
            expect(window.last).toHaveProperty('20');
        });

        test('full slider: middle pages', () => {
            // onEachSide = 3, window = 7. 20 pages. currentPage = 10
            const paginator = new LengthAwarePaginator([], 200, 10, 10);
            const window = UrlWindow.make(paginator);
            expect(window.first).toEqual({
                1: '/?page=1',
                2: '/?page=2'
            });
            expect(window.slider).toEqual({
                7: '/?page=7',
                8: '/?page=8',
                9: '/?page=9',
                10: '/?page=10',
                11: '/?page=11',
                12: '/?page=12',
                13: '/?page=13'
            });
            expect(window.last).toEqual({
                19: '/?page=19',
                20: '/?page=20'
            });
        });
    });
});
