import {foo, type Foo} from "../db/some-lib";

type FooWrapper2 = {
	id : string
	foo: Foo;
}

const fooWrapper2: FooWrapper2 = {
	id: '123',
	foo: foo
}
