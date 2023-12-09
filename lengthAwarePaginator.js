const AbstractPaginator = require('./abstractPaginator');
const Collection = require('@ostro/support/collection')
const UrlWindow = require('./urlWindow');
const { is_object } = require('@ostro/support/function');
class LengthAwarePaginator extends AbstractPaginator {

	$total;

	$lastPage;

	constructor($items, $total, $perPage, $currentPage = null, $options = {}, $request = {}) {
		super();
		this.$options = $options;
		this.$request = $request;

		for (let $key in $options) {
			this[$key] = $options[$key];
		}

		this.$total = $total;
		this.$perPage = parseInt($perPage);
		this.$lastPage = Math.max(parseInt(Math.ceil($total / $perPage)), 1);
		this.$path = this.$path !== '/' ? rtrim(this.$path, '/') : this.$path;
		this.$currentPage = this.setCurrentPage($currentPage, this.$pageName);
		this.$items = $items instanceof Collection ? $items : Collection.make($items);
	}

	setCurrentPage($currentPage, $pageName) {
		$currentPage = $currentPage || this.resolveCurrentPage($pageName);

		return this.isValidPageNumber($currentPage) ? parseInt($currentPage) : 1;
	}

	links($view = null, $data = {}) {
		return this.render($view, $data);
	}

	render($view = null, $data = {}) {
		return this.viewFactory().make($view || this.$defaultView, Object.assign($data, {
			'paginator': this,
			'elements': this.elements(),
		}));
	}

	linkCollection() {
		return new Collection(this.elements()).flatMap(($item) => {
			if (typeof ($item) != 'object') {
				return [{ 'url': null, 'label': '...', 'active': false }];
			}
			let pages = [];
			for(let $page in $item){
				$page = parseInt($page);
				pages.push({
					'url': $item[$page],
					'label': String($page),
					'active': this.currentPage() === $page,
				});
			}
			return pages;
		}).prepend({
			'url': this.previousPageUrl(),
			'label': 'Previous',
			'active': false,
		}).push({
			'url': this.nextPageUrl(),
			'label': 'Next',
			'active': false,
		});
	}

	elements() {
		const window = UrlWindow.make(this);

		return [
			window.first,
			window.slider && is_object(window.slider) ? '...' : null,
			window.last,
		].filter(element => element !== null);
	}

	total() {
		return this.$total;
	}

	hasMorePages() {
		return this.currentPage() < this.lastPage();
	}

	nextPageUrl() {
		if (this.hasMorePages()) {
			return this.url(this.currentPage() + 1);
		}
	}

	lastPage() {
		return this.$lastPage;
	}

	toJson() {
		return {
			'current_page': this.currentPage(),
			'data': this.$items.toArray(),
			'first_page_url': this.url(1),
			'from': this.firstItem(),
			'last_page': this.lastPage(),
			'last_page_url': this.url(this.lastPage()),
			'links': this.linkCollection().toArray(),
			'next_page_url': this.nextPageUrl(),
			'path': this.path(),
			'per_page': this.perPage(),
			'prev_page_url': this.previousPageUrl(),
			'to': this.lastItem(),
			'total': this.total(),
		};
	}

	jsonSerialize() {
		return this.toJson();
	}

}

module.exports = LengthAwarePaginator
