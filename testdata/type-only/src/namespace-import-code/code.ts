import * as somelib from "../db/some-lib";

type FooWrapper2 = {
	id : string
	foo: somelib.Foo;
}

const fooWrapper2: FooWrapper2 = {
	id: '123',
	foo: somelib.foo
}
