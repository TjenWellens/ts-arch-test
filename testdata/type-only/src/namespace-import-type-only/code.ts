import type * as somelib from "../db/some-lib";

type FooBarWrapper = {
	id : string
	foo: somelib.Foo;
	bar: somelib.Bar;
}
