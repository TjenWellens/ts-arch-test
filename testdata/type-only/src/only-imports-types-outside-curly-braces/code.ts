import type {Foo, Bar} from "../db/some-lib";

type FooBarWrapper = {
	id : string
	foo: Foo;
	bar: Bar;
}
