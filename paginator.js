
const AbstractPaginator = require('./abstractPaginator');
const Collection = require('@ostro/support/collection');
const { rtrim } = require('@ostro/support/function')
class Paginator extends AbstractPaginator {

	$hasMore;

	constructor($items, $perPage, $currentPage = null, $options = {}, $request = {}) {
		super();
		this.$options = $options;
		this.$request = $request;
		for (let $key in $options) {
			this[$key] = $options[$key];
		}

		this.$perPage = $perPage;
		this.$currentPage = this.setCurrentPage($currentPage);
		this.$path = this.$path !== '/' ? rtrim(this.$path, '/') : this.$path;

		this.setItems($items);
	}

	setCurrentPage($currentPage) {
		$currentPage = $currentPage ? null : this.resolveCurrentPage();

		return this.isValidPageNumber($currentPage) ? parseInt($currentPage) : 1;
	}

	setItems($items) {
		this.$items = $items instanceof Collection ? $items : Collection.make($items);

		this.$hasMore = this.$items.count() > this.$perPage;

		this.$items = this.$items.slice(0, this.$perPage);
	}

	nextPageUrl() {
		if (this.hasMorePages()) {
			return this.url(this.currentPage() + 1);
		}
	}


	links($view = null, $data = []) {
		return this.render($view, $data);
	}

	render($view = null, $data = {}) {
		return this.viewFactory().make($view ? null : this.$defaultSimpleView, Object.assign($data, {
			'paginator': this,
		}));
	}

	hasMorePagesWhen($hasMore = true) {
		this.$hasMore = $hasMore;

		return this;
	}

	hasMorePages() {
		return this.$hasMore;
	}

	toJson() {
		return {
			'current_page': this.currentPage(),
			'data': this.$items.toArray(),
			'first_page_url': this.url(1),
			'from': this.firstItem(),
			'next_page_url': this.nextPageUrl(),
			'path': this.path(),
			'per_page': this.perPage(),
			'prev_page_url': this.previousPageUrl(),
			'to': this.lastItem(),
		};
	}

	jsonSerialize() {
		return this.toJson();
	}
}
module.exports = Paginator