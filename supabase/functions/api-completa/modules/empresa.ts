import type { Json, RouteContext } from "../../_shared/api/types.ts";

import { error, response } from "../../_shared/api/http.ts";

import { int, str, uuid } from "../../_shared/api/validation.ts";

import { rpc } from "../../_shared/api/rpc.ts";



e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

U

n

i

t

s

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

)

 

{




 

 

c

o

n

s

t

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

e

m

p

r

e

s

a

_

i

d

"

)

,

 

1

0

0

)

;




 

 

i

f

 

(

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

e

m

p

r

e

s

a

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

u

n

i

d

a

d

e

s

"

)




 

 

 

 

.

s

e

l

e

c

t

(

"

i

d

,

e

m

p

r

e

s

a

_

i

d

,

n

o

m

e

,

s

l

u

g

,

e

n

d

e

r

e

c

o

,

c

i

d

a

d

e

,

u

f

,

t

e

l

e

f

o

n

e

,

a

t

i

v

a

,

p

r

i

n

c

i

p

a

l

,

l

a

t

i

t

u

d

e

,

l

o

n

g

i

t

u

d

e

,

l

o

c

a

l

i

z

a

c

a

o

_

a

t

u

a

l

i

z

a

d

a

_

e

m

,

f

r

e

t

e

_

d

i

s

t

a

n

c

i

a

_

a

t

i

v

o

,

f

r

e

t

e

_

t

a

x

a

_

b

a

s

e

,

f

r

e

t

e

_

v

a

l

o

r

_

k

m

,

f

r

e

t

e

_

r

a

i

o

_

m

a

x

_

k

m

,

c

r

e

a

t

e

d

_

a

t

,

u

p

d

a

t

e

d

_

a

t

"

)




 

 

 

 

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)




 

 

 

 

.

o

r

d

e

r

(

"

p

r

i

n

c

i

p

a

l

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)




 

 

 

 

.

o

r

d

e

r

(

"

n

o

m

e

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

t

r

u

e

 

}

)

;




 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

u

n

i

d

a

d

e

s

_

i

n

d

i

s

p

o

n

i

v

e

i

s

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

a

r

r

e

g

a

r

 

a

s

 

u

n

i

d

a

d

e

s

.

"

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

:

 

d

a

t

a

 

|

|

 

[

]

 

}

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

O

p

e

r

a

t

i

o

n

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

)

 

{




 

 

c

o

n

s

t

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

e

m

p

r

e

s

a

_

i

d

"

)

,

 

1

0

0

)

;




 

 

c

o

n

s

t

 

u

n

i

d

a

d

e

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

u

n

i

d

a

d

e

_

i

d

"

)

,

 

1

0

0

)

;




 

 

i

f

 

(

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

e

m

p

r

e

s

a

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

c

o

n

s

t

 

u

n

i

t

F

i

l

t

e

r

 

=

 

(

q

:

 

a

n

y

)

 

=

>

 

u

n

i

d

a

d

e

I

d

 

?

 

q

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

 

:

 

q

;




 

 

c

o

n

s

t

 

[

h

o

r

a

r

i

o

s

Q

,

 

p

a

u

s

a

s

Q

,

 

r

e

g

i

o

e

s

Q

,

 

c

a

n

c

e

l

a

m

e

n

t

o

s

Q

,

 

f

i

d

e

l

i

d

a

d

e

Q

,

 

p

e

d

i

d

o

s

Q

,

 

p

r

o

d

u

t

o

s

Q

,

 

c

a

t

e

g

o

r

i

a

s

Q

]

 

=

 

a

w

a

i

t

 

P

r

o

m

i

s

e

.

a

l

l

(

[




 

 

 

 

u

n

i

t

F

i

l

t

e

r

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

h

o

r

a

r

i

o

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

d

i

a

_

s

e

m

a

n

a

"

)

)

,




 

 

 

 

u

n

i

t

F

i

l

t

e

r

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

p

a

u

s

a

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

i

n

i

c

i

o

"

)

)

,




 

 

 

 

u

n

i

t

F

i

l

t

e

r

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

r

e

g

i

o

e

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

b

a

i

r

r

o

"

)

)

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

e

d

i

d

o

s

"

)

.

s

e

l

e

c

t

(

"

i

d

,

n

u

m

e

r

o

,

c

l

i

e

n

t

e

_

n

o

m

e

,

c

a

n

c

e

l

a

m

e

n

t

o

_

m

o

t

i

v

o

,

c

a

n

c

e

l

a

m

e

n

t

o

_

s

t

a

t

u

s

,

p

a

g

a

m

e

n

t

o

_

m

o

d

a

l

i

d

a

d

e

,

p

a

g

a

m

e

n

t

o

_

s

t

a

t

u

s

,

t

o

t

a

l

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

c

a

n

c

e

l

a

m

e

n

t

o

_

s

t

a

t

u

s

"

,

 

"

s

o

l

i

c

i

t

a

d

o

"

)

.

o

r

d

e

r

(

"

c

a

n

c

e

l

a

m

e

n

t

o

_

s

o

l

i

c

i

t

a

d

o

_

e

m

"

)

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

g

r

a

m

a

_

f

i

d

e

l

i

d

a

d

e

_

e

m

p

r

e

s

a

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

,




 

 

 

 

u

n

i

d

a

d

e

I

d

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

e

d

i

d

o

s

"

)

.

s

e

l

e

c

t

(

"

*

,

 

p

e

d

i

d

o

_

i

t

e

n

s

(

*

)

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

.

o

r

d

e

r

(

"

c

r

e

a

t

e

d

_

a

t

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)

,




 

 

 

 

u

n

i

d

a

d

e

I

d

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)

,




 

 

 

 

u

n

i

d

a

d

e

I

d

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

a

t

e

g

o

r

i

a

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

.

o

r

d

e

r

(

"

o

r

d

e

m

"

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)




 

 

]

)

;




 

 

c

o

n

s

t

 

p

r

i

m

e

i

r

o

E

r

r

o

 

=

 

h

o

r

a

r

i

o

s

Q

.

e

r

r

o

r

 

|

|

 

p

a

u

s

a

s

Q

.

e

r

r

o

r

 

|

|

 

r

e

g

i

o

e

s

Q

.

e

r

r

o

r

 

|

|

 

c

a

n

c

e

l

a

m

e

n

t

o

s

Q

.

e

r

r

o

r

 

|

|

 

f

i

d

e

l

i

d

a

d

e

Q

.

e

r

r

o

r

 

|

|

 

p

e

d

i

d

o

s

Q

.

e

r

r

o

r

 

|

|

 

p

r

o

d

u

t

o

s

Q

.

e

r

r

o

r

 

|

|

 

c

a

t

e

g

o

r

i

a

s

Q

.

e

r

r

o

r

;




 

 

i

f

 

(

p

r

i

m

e

i

r

o

E

r

r

o

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

o

p

e

r

a

c

a

o

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

a

r

r

e

g

a

r

 

a

 

o

p

e

r

a

ç

ã

o

 

d

a

 

e

m

p

r

e

s

a

.

"

)

;




 

 

l

e

t

 

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

 

=

 

n

u

l

l

;




 

 

t

r

y

 

{




 

 

 

 

c

o

n

s

t

 

r

p

c

N

o

m

e

 

=

 

u

n

i

d

a

d

e

I

d

 

?

 

"

e

m

p

r

e

s

a

_

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

_

u

n

i

d

a

d

e

"

 

:

 

"

e

m

p

r

e

s

a

_

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

"

;




 

 

 

 

c

o

n

s

t

 

a

r

g

s

 

=

 

u

n

i

d

a

d

e

I

d




 

 

 

 

 

 

?

 

{

 

p

_

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

p

_

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

p

_

q

u

a

n

d

o

:

 

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

 

}




 

 

 

 

 

 

:

 

{

 

p

_

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

p

_

q

u

a

n

d

o

:

 

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

 

}

;




 

 

 

 

c

o

n

s

t

 

r

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

r

p

c

(

r

p

c

N

o

m

e

,

 

a

r

g

s

)

;




 

 

 

 

i

f

 

(

!

r

.

e

r

r

o

r

)

 

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

 

=

 

r

.

d

a

t

a

 

|

|

 

{

 

a

b

e

r

t

o

:

 

f

a

l

s

e

 

}

;




 

 

}

 

c

a

t

c

h

 

{

 

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

 

=

 

n

u

l

l

;

 

}




 

 

c

o

n

s

t

 

f

i

n

a

n

c

e

i

r

o

 

=

 

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

f

i

n

a

n

c

e

i

r

o

"

)

 

=

=

=

 

"

1

"




 

 

 

 

?

 

a

w

a

i

t

 

c

t

x

.

d

b

.

r

p

c

(

"

e

m

p

r

e

s

a

_

r

e

l

a

t

o

r

i

o

_

f

i

n

a

n

c

e

i

r

o

"

,

 

{

 

p

_

d

i

a

s

:

 

M

a

t

h

.

m

i

n

(

N

u

m

b

e

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

d

i

a

s

"

)

 

|

|

 

3

0

)

,

 

3

6

5

0

)

 

}

)




 

 

 

 

:

 

{

 

d

a

t

a

:

 

n

u

l

l

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

;




 

 

i

f

 

(

f

i

n

a

n

c

e

i

r

o

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

f

i

n

a

n

c

e

i

r

o

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

a

r

r

e

g

a

r

 

o

 

f

i

n

a

n

c

e

i

r

o

.

"

)

;




 

 

r

e

t

u

r

n

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

:

 

{




 

 

 

 

h

o

r

a

r

i

o

s

:

 

h

o

r

a

r

i

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

p

a

u

s

a

s

:

 

p

a

u

s

a

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

r

e

g

i

o

e

s

:

 

r

e

g

i

o

e

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

c

a

n

c

e

l

a

m

e

n

t

o

s

:

 

c

a

n

c

e

l

a

m

e

n

t

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

f

i

d

e

l

i

d

a

d

e

:

 

f

i

d

e

l

i

d

a

d

e

Q

.

d

a

t

a

 

|

|

 

{

}

,




 

 

 

 

p

e

d

i

d

o

s

:

 

p

e

d

i

d

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

p

r

o

d

u

t

o

s

:

 

p

r

o

d

u

t

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

c

a

t

e

g

o

r

i

a

s

:

 

c

a

t

e

g

o

r

i

a

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

,




 

 

 

 

f

i

n

a

n

c

e

i

r

o

:

 

f

i

n

a

n

c

e

i

r

o

.

d

a

t

a

 

|

|

 

n

u

l

l




 

 

}

}

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

U

n

i

t

S

a

v

e

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

,

 

b

o

d

y

:

 

J

s

o

n

)

 

{




 

 

c

o

n

s

t

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

b

o

d

y

.

e

m

p

r

e

s

a

_

i

d

,

 

1

0

0

)

,

 

u

n

i

d

a

d

e

I

d

 

=

 

s

t

r

(

b

o

d

y

.

u

n

i

d

a

d

e

_

i

d

,

 

1

0

0

)

;




 

 

c

o

n

s

t

 

p

a

y

l

o

a

d

 

=

 

b

o

d

y

.

p

a

y

l

o

a

d

 

&

&

 

t

y

p

e

o

f

 

b

o

d

y

.

p

a

y

l

o

a

d

 

=

=

=

 

"

o

b

j

e

c

t

"

 

?

 

b

o

d

y

.

p

a

y

l

o

a

d

 

a

s

 

J

s

o

n

 

:

 

{

}

;




 

 

i

f

 

(

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

e

m

p

r

e

s

a

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

i

f

 

(

u

n

i

d

a

d

e

I

d

 

&

&

 

!

u

u

i

d

(

u

n

i

d

a

d

e

I

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

u

n

i

d

a

d

e

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

c

o

n

s

t

 

c

l

e

a

n

:

 

J

s

o

n

 

=

 

{




 

 

 

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,




 

 

 

 

n

o

m

e

:

 

s

t

r

(

p

a

y

l

o

a

d

.

n

o

m

e

,

 

1

0

0

)

,




 

 

 

 

s

l

u

g

:

 

s

t

r

(

p

a

y

l

o

a

d

.

s

l

u

g

,

 

1

0

0

)

,




 

 

 

 

e

n

d

e

r

e

c

o

:

 

s

t

r

(

p

a

y

l

o

a

d

.

e

n

d

e

r

e

c

o

,

 

2

2

0

)

,




 

 

 

 

c

i

d

a

d

e

:

 

s

t

r

(

p

a

y

l

o

a

d

.

c

i

d

a

d

e

,

 

1

0

0

)

,




 

 

 

 

u

f

:

 

s

t

r

(

p

a

y

l

o

a

d

.

u

f

,

 

2

)

,




 

 

 

 

t

e

l

e

f

o

n

e

:

 

s

t

r

(

p

a

y

l

o

a

d

.

t

e

l

e

f

o

n

e

,

 

3

0

)

,




 

 

 

 

a

t

i

v

a

:

 

t

y

p

e

o

f

 

p

a

y

l

o

a

d

.

a

t

i

v

a

 

=

=

=

 

"

b

o

o

l

e

a

n

"

 

?

 

p

a

y

l

o

a

d

.

a

t

i

v

a

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

p

r

i

n

c

i

p

a

l

:

 

t

y

p

e

o

f

 

p

a

y

l

o

a

d

.

p

r

i

n

c

i

p

a

l

 

=

=

=

 

"

b

o

o

l

e

a

n

"

 

?

 

p

a

y

l

o

a

d

.

p

r

i

n

c

i

p

a

l

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

l

a

t

i

t

u

d

e

:

 

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

l

a

t

i

t

u

d

e

)

)

 

?

 

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

l

a

t

i

t

u

d

e

)

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

l

o

n

g

i

t

u

d

e

:

 

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

l

o

n

g

i

t

u

d

e

)

)

 

?

 

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

l

o

n

g

i

t

u

d

e

)

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

f

r

e

t

e

_

d

i

s

t

a

n

c

i

a

_

a

t

i

v

o

:

 

t

y

p

e

o

f

 

p

a

y

l

o

a

d

.

f

r

e

t

e

_

d

i

s

t

a

n

c

i

a

_

a

t

i

v

o

 

=

=

=

 

"

b

o

o

l

e

a

n

"

 

?

 

p

a

y

l

o

a

d

.

f

r

e

t

e

_

d

i

s

t

a

n

c

i

a

_

a

t

i

v

o

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

f

r

e

t

e

_

t

a

x

a

_

b

a

s

e

:

 

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

t

a

x

a

_

b

a

s

e

)

)

 

?

 

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

t

a

x

a

_

b

a

s

e

)

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

f

r

e

t

e

_

v

a

l

o

r

_

k

m

:

 

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

v

a

l

o

r

_

k

m

)

)

 

?

 

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

v

a

l

o

r

_

k

m

)

 

:

 

u

n

d

e

f

i

n

e

d

,




 

 

 

 

f

r

e

t

e

_

r

a

i

o

_

m

a

x

_

k

m

:

 

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

r

a

i

o

_

m

a

x

_

k

m

)

)

 

?

 

N

u

m

b

e

r

(

p

a

y

l

o

a

d

.

f

r

e

t

e

_

r

a

i

o

_

m

a

x

_

k

m

)

 

:

 

u

n

d

e

f

i

n

e

d




 

 

}

;




 

 

f

o

r

 

(

c

o

n

s

t

 

k

 

o

f

 

O

b

j

e

c

t

.

k

e

y

s

(

c

l

e

a

n

)

)

 

i

f

 

(

c

l

e

a

n

[

k

]

 

=

=

=

 

u

n

d

e

f

i

n

e

d

)

 

d

e

l

e

t

e

 

c

l

e

a

n

[

k

]

;




 

 

i

f

 

(

!

c

l

e

a

n

.

n

o

m

e

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

n

o

m

e

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

c

o

n

s

t

 

q

 

=

 

u

n

i

d

a

d

e

I

d




 

 

 

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

u

n

i

d

a

d

e

s

"

)

.

u

p

d

a

t

e

(

c

l

e

a

n

)

.

e

q

(

"

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)




 

 

 

 

:

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

u

n

i

d

a

d

e

s

"

)

.

i

n

s

e

r

t

(

{

 

.

.

.

c

l

e

a

n

,

 

s

l

u

g

:

 

c

l

e

a

n

.

s

l

u

g

 

|

|

 

"

u

n

i

d

a

d

e

-

"

 

+

 

D

a

t

e

.

n

o

w

(

)

,

 

a

t

i

v

a

:

 

c

l

e

a

n

.

a

t

i

v

a

 

?

?

 

t

r

u

e

,

 

p

r

i

n

c

i

p

a

l

:

 

c

l

e

a

n

.

p

r

i

n

c

i

p

a

l

 

?

?

 

f

a

l

s

e

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

q

;




 

 

i

f

 

(

e

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

e

.

c

o

d

e

 

=

=

=

 

"

2

3

5

0

5

"

 

?

 

4

0

9

 

:

 

4

0

0

,

 

e

.

c

o

d

e

 

=

=

=

 

"

2

3

5

0

5

"

 

?

 

"

u

n

i

d

a

d

e

_

d

u

p

l

i

c

a

d

a

"

 

:

 

"

u

n

i

d

a

d

e

_

r

e

c

u

s

a

d

a

"

,

 

e

.

m

e

s

s

a

g

e

 

|

|

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

s

a

l

v

a

r

 

a

 

u

n

i

d

a

d

e

.

"

)

;




 

 

r

e

t

u

r

n

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

 

}

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

O

p

e

r

a

t

i

o

n

A

c

t

i

o

n

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

,

 

b

o

d

y

:

 

J

s

o

n

)

 

{




 

 

c

o

n

s

t

 

a

c

a

o

 

=

 

s

t

r

(

b

o

d

y

.

a

c

a

o

,

 

5

0

)

,

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

b

o

d

y

.

e

m

p

r

e

s

a

_

i

d

,

 

1

0

0

)

;

 

l

e

t

 

u

n

i

d

a

d

e

I

d

 

=

 

s

t

r

(

b

o

d

y

.

u

n

i

d

a

d

e

_

i

d

,

 

1

0

0

)

;




 

 

i

f

 

(

!

a

c

a

o

 

|

|

 

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

a

c

a

o

 

e

 

e

m

p

r

e

s

a

_

i

d

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

i

f

 

(

u

n

i

d

a

d

e

I

d

 

&

&

 

!

u

u

i

d

(

u

n

i

d

a

d

e

I

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

u

n

i

d

a

d

e

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

i

f

 

(

!

u

n

i

d

a

d

e

I

d

 

&

&

 

[

"

h

o

r

a

r

i

o

s

"

,

"

p

a

u

s

a

_

c

r

i

a

r

"

,

"

p

a

u

s

a

_

r

e

m

o

v

e

r

"

,

"

r

e

g

i

a

o

_

c

r

i

a

r

"

,

"

r

e

g

i

a

o

_

t

o

g

g

l

e

"

,

"

r

e

g

i

a

o

_

r

e

m

o

v

e

r

"

,

"

c

a

t

e

g

o

r

i

a

_

c

r

i

a

r

"

,

"

p

r

o

d

u

t

o

_

s

a

l

v

a

r

"

]

.

i

n

c

l

u

d

e

s

(

a

c

a

o

)

)

 

{




 

 

 

 

c

o

n

s

t

 

p

r

i

n

c

i

p

a

l

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

u

n

i

d

a

d

e

s

"

)

.

s

e

l

e

c

t

(

"

i

d

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

p

r

i

n

c

i

p

a

l

"

,

 

t

r

u

e

)

.

e

q

(

"

a

t

i

v

a

"

,

 

t

r

u

e

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

;




 

 

 

 

i

f

 

(

p

r

i

n

c

i

p

a

l

.

e

r

r

o

r

 

|

|

 

!

p

r

i

n

c

i

p

a

l

.

d

a

t

a

?

.

i

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

u

n

i

d

a

d

e

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

A

 

e

m

p

r

e

s

a

 

n

ã

o

 

p

o

s

s

u

i

 

u

n

i

d

a

d

e

 

p

r

i

n

c

i

p

a

l

 

a

t

i

v

a

.

"

)

;




 

 

 

 

u

n

i

d

a

d

e

I

d

 

=

 

S

t

r

i

n

g

(

p

r

i

n

c

i

p

a

l

.

d

a

t

a

.

i

d

)

;




 

 

}




 

 

c

o

n

s

t

 

u

n

i

t

 

=

 

(

q

:

 

a

n

y

)

 

=

>

 

q

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

;




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

a

t

e

g

o

r

i

a

_

c

r

i

a

r

"

)

 

{




 

 

 

 

i

f

 

(

!

u

n

i

d

a

d

e

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

u

n

i

d

a

d

e

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

n

o

m

e

 

=

 

s

t

r

(

b

o

d

y

.

n

o

m

e

,

1

2

0

)

;




 

 

 

 

i

f

 

(

!

n

o

m

e

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

n

o

m

e

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

c

a

t

e

g

o

r

i

a

s

"

)

.

i

n

s

e

r

t

(

{

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

n

o

m

e

,

 

o

r

d

e

m

:

 

N

u

m

b

e

r

(

b

o

d

y

.

o

r

d

e

m

 

?

?

 

0

)

,

 

a

t

i

v

o

:

 

t

r

u

e

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

e

.

c

o

d

e

=

=

=

"

2

3

5

0

5

"

?

4

0

9

:

4

0

0

,

e

.

c

o

d

e

=

=

=

"

2

3

5

0

5

"

?

"

c

a

t

e

g

o

r

i

a

_

d

u

p

l

i

c

a

d

a

"

:

"

c

a

t

e

g

o

r

i

a

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

r

o

d

u

t

o

_

s

a

l

v

a

r

"

)

 

{




 

 

 

 

i

f

 

(

!

u

n

i

d

a

d

e

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

u

n

i

d

a

d

e

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

i

d

 

=

 

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;




 

 

 

 

c

o

n

s

t

 

p

a

y

l

o

a

d

 

=

 

{




 

 

 

 

 

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

c

a

t

e

g

o

r

i

a

_

i

d

:

 

s

t

r

(

b

o

d

y

.

c

a

t

e

g

o

r

i

a

_

i

d

,

1

0

0

)

 

|

|

 

n

u

l

l

,




 

 

 

 

 

 

n

o

m

e

:

 

s

t

r

(

b

o

d

y

.

n

o

m

e

,

1

6

0

)

,

 

d

e

s

c

r

i

c

a

o

:

 

s

t

r

(

b

o

d

y

.

d

e

s

c

r

i

c

a

o

,

2

0

0

0

)

 

|

|

 

n

u

l

l

,

 

i

m

a

g

e

m

:

 

s

t

r

(

b

o

d

y

.

i

m

a

g

e

m

,

1

0

0

0

)

 

|

|

 

n

u

l

l

,




 

 

 

 

 

 

p

r

e

c

o

:

 

N

u

m

b

e

r

(

b

o

d

y

.

p

r

e

c

o

)

,

 

p

r

o

m

o

c

a

o

:

 

b

o

d

y

.

p

r

o

m

o

c

a

o

 

=

=

=

 

n

u

l

l

 

|

|

 

b

o

d

y

.

p

r

o

m

o

c

a

o

 

=

=

=

 

u

n

d

e

f

i

n

e

d

 

|

|

 

b

o

d

y

.

p

r

o

m

o

c

a

o

 

=

=

=

 

"

"

 

?

 

n

u

l

l

 

:

 

N

u

m

b

e

r

(

b

o

d

y

.

p

r

o

m

o

c

a

o

)

,




 

 

 

 

 

 

d

i

s

p

o

n

i

v

e

l

:

 

b

o

d

y

.

d

i

s

p

o

n

i

v

e

l

 

!

=

=

 

f

a

l

s

e

,

 

c

o

n

t

r

o

l

e

_

e

s

t

o

q

u

e

:

 

b

o

d

y

.

c

o

n

t

r

o

l

e

_

e

s

t

o

q

u

e

 

=

=

=

 

t

r

u

e

,




 

 

 

 

 

 

e

s

t

o

q

u

e

:

 

N

u

m

b

e

r

(

b

o

d

y

.

e

s

t

o

q

u

e

 

|

|

 

0

)

,

 

e

s

t

o

q

u

e

_

m

i

n

i

m

o

:

 

N

u

m

b

e

r

(

b

o

d

y

.

e

s

t

o

q

u

e

_

m

i

n

i

m

o

 

|

|

 

0

)




 

 

 

 

}

;




 

 

 

 

i

f

 

(

!

p

a

y

l

o

a

d

.

n

o

m

e

 

|

|

 

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

a

y

l

o

a

d

.

p

r

e

c

o

)

 

|

|

 

p

a

y

l

o

a

d

.

p

r

e

c

o

 

<

 

0

 

|

|

 

!

N

u

m

b

e

r

.

i

s

I

n

t

e

g

e

r

(

p

a

y

l

o

a

d

.

e

s

t

o

q

u

e

)

 

|

|

 

p

a

y

l

o

a

d

.

e

s

t

o

q

u

e

 

<

 

0

 

|

|

 

!

N

u

m

b

e

r

.

i

s

I

n

t

e

g

e

r

(

p

a

y

l

o

a

d

.

e

s

t

o

q

u

e

_

m

i

n

i

m

o

)

 

|

|

 

p

a

y

l

o

a

d

.

e

s

t

o

q

u

e

_

m

i

n

i

m

o

 

<

 

0

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

i

n

v

a

l

i

d

o

"

,

"

D

a

d

o

s

 

d

o

 

p

r

o

d

u

t

o

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

i

f

 

(

p

a

y

l

o

a

d

.

p

r

o

m

o

c

a

o

 

!

=

=

 

n

u

l

l

 

&

&

 

(

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

a

y

l

o

a

d

.

p

r

o

m

o

c

a

o

)

 

|

|

 

p

a

y

l

o

a

d

.

p

r

o

m

o

c

a

o

 

<

=

 

0

 

|

|

 

p

a

y

l

o

a

d

.

p

r

o

m

o

c

a

o

 

>

=

 

p

a

y

l

o

a

d

.

p

r

e

c

o

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

i

n

v

a

l

i

d

o

"

,

"

P

r

e

ç

o

 

p

r

o

m

o

c

i

o

n

a

l

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

q

 

=

 

i

d

 

?

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

u

p

d

a

t

e

(

p

a

y

l

o

a

d

)

.

e

q

(

"

i

d

"

,

i

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

)

 

:

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

i

n

s

e

r

t

(

p

a

y

l

o

a

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

q

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

h

o

r

a

r

i

o

s

"

)

 

{




 

 

 

 

i

f

 

(

!

u

n

i

d

a

d

e

I

d

 

|

|

 

!

A

r

r

a

y

.

i

s

A

r

r

a

y

(

b

o

d

y

.

r

e

g

i

s

t

r

o

s

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

u

n

i

d

a

d

e

_

i

d

 

e

 

r

e

g

i

s

t

r

o

s

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

r

e

g

i

s

t

r

o

s

 

=

 

b

o

d

y

.

r

e

g

i

s

t

r

o

s

.

m

a

p

(

(

r

:

 

a

n

y

)

 

=

>

 

(

{

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

d

i

a

_

s

e

m

a

n

a

:

 

i

n

t

(

r

.

d

i

a

_

s

e

m

a

n

a

,

 

0

,

 

6

)

,

 

a

t

i

v

o

:

 

r

.

a

t

i

v

o

 

!

=

=

 

f

a

l

s

e

,

 

a

b

r

e

:

 

s

t

r

(

r

.

a

b

r

e

,

 

8

)

,

 

f

e

c

h

a

:

 

s

t

r

(

r

.

f

e

c

h

a

,

 

8

)

,

 

u

p

d

a

t

e

d

_

a

t

:

 

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

 

}

)

)

;




 

 

 

 

i

f

 

(

r

e

g

i

s

t

r

o

s

.

s

o

m

e

(

(

r

:

 

a

n

y

)

 

=

>

 

r

.

d

i

a

_

s

e

m

a

n

a

 

=

=

=

 

n

u

l

l

 

|

|

 

!

r

.

a

b

r

e

 

|

|

 

!

r

.

f

e

c

h

a

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

h

o

r

a

r

i

o

s

_

i

n

v

a

l

i

d

o

s

"

,

 

"

H

á

 

h

o

r

á

r

i

o

s

 

i

n

v

á

l

i

d

o

s

 

n

o

 

e

n

v

i

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

h

o

r

a

r

i

o

s

"

)

.

u

p

s

e

r

t

(

r

e

g

i

s

t

r

o

s

,

 

{

 

o

n

C

o

n

f

l

i

c

t

:

 

"

e

m

p

r

e

s

a

_

i

d

,

u

n

i

d

a

d

e

_

i

d

,

d

i

a

_

s

e

m

a

n

a

"

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

h

o

r

a

r

i

o

s

_

r

e

c

u

s

a

d

o

s

"

,

 

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

:

 

d

a

t

a

 

|

|

 

[

]

 

}

)

;




 

 

}




 

 

i

f

 

(

!

u

n

i

d

a

d

e

I

d

 

&

&

 

[

"

p

a

u

s

a

_

c

r

i

a

r

"

,

"

p

a

u

s

a

_

r

e

m

o

v

e

r

"

,

"

r

e

g

i

a

o

_

c

r

i

a

r

"

,

"

r

e

g

i

a

o

_

t

o

g

g

l

e

"

,

"

r

e

g

i

a

o

_

r

e

m

o

v

e

r

"

]

.

i

n

c

l

u

d

e

s

(

a

c

a

o

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

u

n

i

d

a

d

e

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

 

p

a

r

a

 

e

s

t

a

 

o

p

e

r

a

ç

ã

o

.

"

)

;




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

a

u

s

a

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

n

i

c

i

o

 

=

 

s

t

r

(

b

o

d

y

.

i

n

i

c

i

o

,

 

8

0

)

,

 

f

i

m

 

=

 

s

t

r

(

b

o

d

y

.

f

i

m

,

 

8

0

)

;




 

 

 

 

i

f

 

(

!

i

n

i

c

i

o

 

|

|

 

!

f

i

m

 

|

|

 

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

n

e

w

 

D

a

t

e

(

i

n

i

c

i

o

)

.

g

e

t

T

i

m

e

(

)

)

 

|

|

 

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

n

e

w

 

D

a

t

e

(

f

i

m

)

.

g

e

t

T

i

m

e

(

)

)

 

|

|

 

n

e

w

 

D

a

t

e

(

f

i

m

)

 

<

=

 

n

e

w

 

D

a

t

e

(

i

n

i

c

i

o

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

u

s

a

_

i

n

v

a

l

i

d

a

"

,

 

"

I

n

í

c

i

o

 

e

 

f

i

m

 

d

a

 

p

a

u

s

a

 

s

ã

o

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

p

a

u

s

a

s

"

)

.

i

n

s

e

r

t

(

{

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

i

n

i

c

i

o

:

 

n

e

w

 

D

a

t

e

(

i

n

i

c

i

o

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

,

 

f

i

m

:

 

n

e

w

 

D

a

t

e

(

f

i

m

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

,

 

m

o

t

i

v

o

:

 

s

t

r

(

b

o

d

y

.

m

o

t

i

v

o

,

 

5

0

0

)

 

|

|

 

n

u

l

l

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

u

s

a

_

r

e

c

u

s

a

d

a

"

,

 

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

 

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

a

u

s

a

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

 

=

 

s

t

r

(

b

o

d

y

.

i

d

,

 

1

0

0

)

;

 

i

f

 

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

i

d

 

d

a

 

p

a

u

s

a

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

p

a

u

s

a

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

 

i

d

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

u

s

a

_

r

e

c

u

s

a

d

a

"

,

 

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

:

 

t

r

u

e

 

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

r

e

g

i

a

o

_

c

r

i

a

r

"

)

 

{




 

 

 

 

i

f

 

(

!

s

t

r

(

b

o

d

y

.

b

a

i

r

r

o

,

 

1

6

0

)

 

|

|

 

!

s

t

r

(

b

o

d

y

.

c

i

d

a

d

e

,

 

1

0

0

)

 

|

|

 

!

/

^

[

A

-

Z

a

-

z

]

{

2

}

$

/

.

t

e

s

t

(

S

t

r

i

n

g

(

b

o

d

y

.

u

f

 

|

|

 

"

"

)

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

r

e

g

i

a

o

_

i

n

v

a

l

i

d

a

"

,

 

"

R

e

g

i

ã

o

 

i

n

c

o

m

p

l

e

t

a

.

"

)

;




 

 

 

 

c

o

n

s

t

 

p

a

y

l

o

a

d

 

=

 

{

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

u

n

i

d

a

d

e

_

i

d

:

 

u

n

i

d

a

d

e

I

d

,

 

b

a

i

r

r

o

:

 

s

t

r

(

b

o

d

y

.

b

a

i

r

r

o

,

1

6

0

)

,

 

c

i

d

a

d

e

:

 

s

t

r

(

b

o

d

y

.

c

i

d

a

d

e

,

1

0

0

)

,

 

u

f

:

 

s

t

r

(

b

o

d

y

.

u

f

,

2

)

?

.

t

o

U

p

p

e

r

C

a

s

e

(

)

,

 

t

a

x

a

_

e

n

t

r

e

g

a

:

 

N

u

m

b

e

r

(

b

o

d

y

.

t

a

x

a

_

e

n

t

r

e

g

a

)

,

 

p

e

d

i

d

o

_

m

i

n

i

m

o

:

 

N

u

m

b

e

r

(

b

o

d

y

.

p

e

d

i

d

o

_

m

i

n

i

m

o

)

,

 

t

e

m

p

o

_

m

i

n

:

 

N

u

m

b

e

r

(

b

o

d

y

.

t

e

m

p

o

_

m

i

n

)

,

 

t

e

m

p

o

_

m

a

x

:

 

N

u

m

b

e

r

(

b

o

d

y

.

t

e

m

p

o

_

m

a

x

)

,

 

a

t

i

v

o

:

 

t

r

u

e

 

}

;




 

 

 

 

i

f

 

(

!

[

p

a

y

l

o

a

d

.

t

a

x

a

_

e

n

t

r

e

g

a

,

p

a

y

l

o

a

d

.

p

e

d

i

d

o

_

m

i

n

i

m

o

,

p

a

y

l

o

a

d

.

t

e

m

p

o

_

m

i

n

,

p

a

y

l

o

a

d

.

t

e

m

p

o

_

m

a

x

]

.

e

v

e

r

y

(

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

)

 

|

|

 

p

a

y

l

o

a

d

.

t

a

x

a

_

e

n

t

r

e

g

a

 

<

 

0

 

|

|

 

p

a

y

l

o

a

d

.

p

e

d

i

d

o

_

m

i

n

i

m

o

 

<

 

0

 

|

|

 

p

a

y

l

o

a

d

.

t

e

m

p

o

_

m

i

n

 

<

 

5

 

|

|

 

p

a

y

l

o

a

d

.

t

e

m

p

o

_

m

a

x

 

<

 

p

a

y

l

o

a

d

.

t

e

m

p

o

_

m

i

n

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

r

e

g

i

a

o

_

i

n

v

a

l

i

d

a

"

,

 

"

V

a

l

o

r

e

s

 

d

a

 

r

e

g

i

ã

o

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

r

e

g

i

o

e

s

"

)

.

i

n

s

e

r

t

(

p

a

y

l

o

a

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

r

e

g

i

a

o

_

r

e

c

u

s

a

d

a

"

,

 

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

 

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

r

e

g

i

a

o

_

t

o

g

g

l

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

 

=

 

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

r

e

g

i

ã

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

r

e

g

i

o

e

s

"

)

.

u

p

d

a

t

e

(

{

 

a

t

i

v

o

:

 

b

o

d

y

.

a

t

i

v

o

 

=

=

=

 

t

r

u

e

,

 

u

p

d

a

t

e

d

_

a

t

:

 

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

 

}

)

.

e

q

(

"

i

d

"

,

i

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

r

e

g

i

a

o

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

r

e

g

i

a

o

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

 

=

 

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

r

e

g

i

ã

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

u

n

i

t

(

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

r

e

g

i

o

e

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

r

e

g

i

a

o

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

f

i

d

e

l

i

d

a

d

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

g

r

a

m

a

_

f

i

d

e

l

i

d

a

d

e

_

e

m

p

r

e

s

a

"

)

.

u

p

s

e

r

t

(

{




 

 

 

 

 

 

e

m

p

r

e

s

a

_

i

d

:

 

e

m

p

r

e

s

a

I

d

,

 

a

t

i

v

o

:

 

b

o

d

y

.

a

t

i

v

o

 

=

=

=

 

t

r

u

e

,

 

p

o

n

t

o

s

_

p

o

r

_

r

e

a

l

:

 

N

u

m

b

e

r

(

b

o

d

y

.

p

o

n

t

o

s

_

p

o

r

_

r

e

a

l

)

,

 

p

o

n

t

o

s

_

p

a

r

a

_

b

e

n

e

f

i

c

i

o

:

 

N

u

m

b

e

r

(

b

o

d

y

.

p

o

n

t

o

s

_

p

a

r

a

_

b

e

n

e

f

i

c

i

o

)

,

 

v

a

l

o

r

_

b

e

n

e

f

i

c

i

o

:

 

N

u

m

b

e

r

(

b

o

d

y

.

v

a

l

o

r

_

b

e

n

e

f

i

c

i

o

)

,

 

u

p

d

a

t

e

d

_

a

t

:

 

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)




 

 

 

 

}

,

 

{

 

o

n

C

o

n

f

l

i

c

t

:

 

"

e

m

p

r

e

s

a

_

i

d

"

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

f

i

d

e

l

i

d

a

d

e

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

a

n

c

e

l

a

m

e

n

t

o

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

 

=

 

s

t

r

(

b

o

d

y

.

p

e

d

i

d

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

e

d

i

d

o

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

d

e

c

i

d

i

r

_

c

a

n

c

e

l

a

m

e

n

t

o

"

,

{

p

_

p

e

d

i

d

o

_

i

d

:

i

d

,

p

_

a

p

r

o

v

a

r

:

b

o

d

y

.

a

p

r

o

v

a

r

=

=

=

t

r

u

e

,

p

_

o

b

s

e

r

v

a

c

a

o

:

s

t

r

(

b

o

d

y

.

o

b

s

e

r

v

a

c

a

o

,

2

0

0

0

)

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

f

i

n

a

n

c

e

i

r

o

"

)

 

{




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

r

e

l

a

t

o

r

i

o

_

f

i

n

a

n

c

e

i

r

o

"

,

{

p

_

d

i

a

s

:

M

a

t

h

.

m

i

n

(

N

u

m

b

e

r

(

b

o

d

y

.

d

i

a

s

|

|

3

0

)

,

3

6

5

0

)

}

)

;




 

 

}




 

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

4

,

"

o

p

e

r

a

c

a

o

_

n

a

o

_

e

n

c

o

n

t

r

a

d

a

"

,

"

O

p

e

r

a

ç

ã

o

 

d

a

 

e

m

p

r

e

s

a

 

n

ã

o

 

e

n

c

o

n

t

r

a

d

a

.

"

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

P

a

n

e

l

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

)

 

{




 

 

c

o

n

s

t

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

e

m

p

r

e

s

a

_

i

d

"

)

,

 

1

0

0

)

;




 

 

c

o

n

s

t

 

u

n

i

d

a

d

e

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

u

n

i

d

a

d

e

_

i

d

"

)

,

 

1

0

0

)

;




 

 

i

f

 

(

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

e

m

p

r

e

s

a

_

i

d

 

é

 

o

b

r

i

g

a

t

ó

r

i

o

.

"

)

;




 

 

i

f

 

(

u

n

i

d

a

d

e

I

d

 

&

&

 

!

u

u

i

d

(

u

n

i

d

a

d

e

I

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

 

"

u

n

i

d

a

d

e

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

c

o

n

s

t

 

p

e

d

i

d

o

s

Q

u

e

r

y

 

=

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

e

d

i

d

o

s

"

)

.

s

e

l

e

c

t

(

"

*

,

 

p

e

d

i

d

o

_

i

t

e

n

s

(

*

)

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

c

r

e

a

t

e

d

_

a

t

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)

;




 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

s

Q

u

e

r

y

 

=

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

;




 

 

c

o

n

s

t

 

c

a

t

e

g

o

r

i

a

s

Q

u

e

r

y

 

=

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

a

t

e

g

o

r

i

a

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

o

r

d

e

m

"

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

;




 

 

i

f

 

(

u

n

i

d

a

d

e

I

d

)

 

{




 

 

 

 

p

e

d

i

d

o

s

Q

u

e

r

y

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

;




 

 

 

 

p

r

o

d

u

t

o

s

Q

u

e

r

y

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

;




 

 

 

 

c

a

t

e

g

o

r

i

a

s

Q

u

e

r

y

.

e

q

(

"

u

n

i

d

a

d

e

_

i

d

"

,

 

u

n

i

d

a

d

e

I

d

)

;




 

 

}




 

 

c

o

n

s

t

 

[

e

m

p

r

e

s

a

Q

,

 

p

e

d

i

d

o

s

Q

,

 

p

r

o

d

u

t

o

s

Q

,

 

c

a

t

e

g

o

r

i

a

s

Q

,

 

g

r

u

p

o

s

Q

,

 

c

u

p

o

n

s

Q

,

 

a

v

a

l

i

a

c

o

e

s

Q

,

 

m

o

v

i

m

e

n

t

o

s

Q

]

 

=

 

a

w

a

i

t

 

P

r

o

m

i

s

e

.

a

l

l

(

[




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

,




 

 

 

 

p

e

d

i

d

o

s

Q

u

e

r

y

,




 

 

 

 

p

r

o

d

u

t

o

s

Q

u

e

r

y

,




 

 

 

 

c

a

t

e

g

o

r

i

a

s

Q

u

e

r

y

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

u

p

o

n

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

c

r

e

a

t

e

d

_

a

t

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

a

v

a

l

i

a

c

o

e

s

"

)

.

s

e

l

e

c

t

(

"

i

d

,

p

e

d

i

d

o

_

i

d

,

n

o

t

a

,

c

o

m

e

n

t

a

r

i

o

,

r

e

s

p

o

s

t

a

,

a

u

t

o

r

_

n

o

m

e

,

a

u

t

o

r

_

a

v

a

t

a

r

_

u

r

l

,

c

r

e

a

t

e

d

_

a

t

,

u

p

d

a

t

e

d

_

a

t

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

c

r

e

a

t

e

d

_

a

t

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)

.

l

i

m

i

t

(

2

0

0

)

,




 

 

 

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

s

t

o

q

u

e

_

m

o

v

i

m

e

n

t

o

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

 

e

m

p

r

e

s

a

I

d

)

.

o

r

d

e

r

(

"

c

r

e

a

t

e

d

_

a

t

"

,

 

{

 

a

s

c

e

n

d

i

n

g

:

 

f

a

l

s

e

 

}

)

.

l

i

m

i

t

(

5

0

)




 

 

]

)

;




 

 

c

o

n

s

t

 

b

a

s

e

E

r

r

o

 

=

 

e

m

p

r

e

s

a

Q

.

e

r

r

o

r

 

|

|

 

p

e

d

i

d

o

s

Q

.

e

r

r

o

r

 

|

|

 

p

r

o

d

u

t

o

s

Q

.

e

r

r

o

r

 

|

|

 

c

a

t

e

g

o

r

i

a

s

Q

.

e

r

r

o

r

 

|

|

 

g

r

u

p

o

s

Q

.

e

r

r

o

r

 

|

|

 

c

u

p

o

n

s

Q

.

e

r

r

o

r

 

|

|

 

a

v

a

l

i

a

c

o

e

s

Q

.

e

r

r

o

r

 

|

|

 

m

o

v

i

m

e

n

t

o

s

Q

.

e

r

r

o

r

;




 

 

i

f

 

(

b

a

s

e

E

r

r

o

 

|

|

 

!

e

m

p

r

e

s

a

Q

.

d

a

t

a

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

p

a

i

n

e

l

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

a

r

r

e

g

a

r

 

o

 

p

a

i

n

e

l

 

d

a

 

e

m

p

r

e

s

a

.

"

)

;




 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

I

d

s

 

=

 

(

p

r

o

d

u

t

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

)

.

m

a

p

(

(

i

t

e

m

:

a

n

y

)

 

=

>

 

S

t

r

i

n

g

(

i

t

e

m

.

i

d

)

)

;




 

 

c

o

n

s

t

 

g

r

u

p

o

I

d

s

 

=

 

(

g

r

u

p

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

)

.

m

a

p

(

(

i

t

e

m

:

a

n

y

)

 

=

>

 

S

t

r

i

n

g

(

i

t

e

m

.

i

d

)

)

;




 

 

c

o

n

s

t

 

[

a

d

i

c

i

o

n

a

i

s

Q

,

 

v

i

n

c

u

l

o

s

Q

,

 

v

a

r

i

a

n

t

e

s

Q

]

 

=

 

a

w

a

i

t

 

P

r

o

m

i

s

e

.

a

l

l

(

[




 

 

 

 

g

r

u

p

o

I

d

s

.

l

e

n

g

t

h

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

a

d

i

c

i

o

n

a

i

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

i

n

(

"

g

r

u

p

o

_

i

d

"

,

 

g

r

u

p

o

I

d

s

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)

,




 

 

 

 

p

r

o

d

u

t

o

I

d

s

.

l

e

n

g

t

h

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

g

r

u

p

o

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

i

n

(

"

p

r

o

d

u

t

o

_

i

d

"

,

 

p

r

o

d

u

t

o

I

d

s

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)

,




 

 

 

 

p

r

o

d

u

t

o

I

d

s

.

l

e

n

g

t

h

 

?

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

i

n

(

"

p

r

o

d

u

t

o

_

i

d

"

,

 

p

r

o

d

u

t

o

I

d

s

)

.

o

r

d

e

r

(

"

o

r

d

e

m

"

)

.

o

r

d

e

r

(

"

n

o

m

e

"

)

 

:

 

P

r

o

m

i

s

e

.

r

e

s

o

l

v

e

(

{

 

d

a

t

a

:

 

[

]

,

 

e

r

r

o

r

:

 

n

u

l

l

 

}

)




 

 

]

)

;




 

 

i

f

 

(

a

d

i

c

i

o

n

a

i

s

Q

.

e

r

r

o

r

 

|

|

 

v

i

n

c

u

l

o

s

Q

.

e

r

r

o

r

 

|

|

 

v

a

r

i

a

n

t

e

s

Q

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

p

a

i

n

e

l

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

a

r

r

e

g

a

r

 

o

 

c

a

t

á

l

o

g

o

 

d

o

 

p

a

i

n

e

l

.

"

)

;




 

 

r

e

t

u

r

n

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

{




 

 

 

 

e

m

p

r

e

s

a

:

 

e

m

p

r

e

s

a

Q

.

d

a

t

a

,




 

 

 

 

p

e

d

i

d

o

s

:

 

p

e

d

i

d

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

p

r

o

d

u

t

o

s

:

 

p

r

o

d

u

t

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

c

a

t

e

g

o

r

i

a

s

:

 

c

a

t

e

g

o

r

i

a

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

:

 

g

r

u

p

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

c

u

p

o

n

s

:

 

c

u

p

o

n

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

a

v

a

l

i

a

c

o

e

s

:

 

a

v

a

l

i

a

c

o

e

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

a

d

i

c

i

o

n

a

i

s

:

 

a

d

i

c

i

o

n

a

i

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

v

i

n

c

u

l

o

s

_

p

r

o

d

u

t

o

_

g

r

u

p

o

:

 

v

i

n

c

u

l

o

s

Q

.

d

a

t

a

 

|

|

 

[

]

,

 

v

a

r

i

a

n

t

e

s

_

p

r

o

d

u

t

o

:

 

v

a

r

i

a

n

t

e

s

Q

.

d

a

t

a

 

|

|

 

[

]

,




 

 

 

 

e

s

t

o

q

u

e

_

m

o

v

i

m

e

n

t

o

s

:

 

m

o

v

i

m

e

n

t

o

s

Q

.

d

a

t

a

 

|

|

 

[

]




 

 

}

}

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

P

a

n

e

l

A

c

t

i

o

n

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

,

 

b

o

d

y

:

 

J

s

o

n

)

 

{




 

 

c

o

n

s

t

 

a

c

a

o

 

=

 

s

t

r

(

b

o

d

y

.

a

c

a

o

,

 

6

0

)

,

 

e

m

p

r

e

s

a

I

d

 

=

 

s

t

r

(

b

o

d

y

.

e

m

p

r

e

s

a

_

i

d

,

1

0

0

)

;




 

 

i

f

 

(

!

a

c

a

o

 

|

|

 

!

e

m

p

r

e

s

a

I

d

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

a

c

a

o

 

e

 

e

m

p

r

e

s

a

_

i

d

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

e

d

i

d

o

_

p

a

g

a

m

e

n

t

o

_

o

f

f

l

i

n

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

p

e

d

i

d

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

e

d

i

d

o

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

m

a

r

c

a

r

_

p

a

g

a

m

e

n

t

o

_

o

f

f

l

i

n

e

"

,

{

p

_

p

e

d

i

d

o

_

i

d

:

i

d

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

e

d

i

d

o

_

c

a

n

c

e

l

a

r

_

n

a

o

_

p

a

g

o

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

p

e

d

i

d

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

e

d

i

d

o

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

c

a

n

c

e

l

a

r

_

p

e

d

i

d

o

_

n

a

o

_

p

a

g

o

"

,

{

p

_

p

e

d

i

d

o

_

i

d

:

i

d

,

p

_

m

o

t

i

v

o

:

s

t

r

(

b

o

d

y

.

m

o

t

i

v

o

,

5

0

0

)

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

e

d

i

d

o

_

o

p

e

r

a

c

a

o

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

p

e

d

i

d

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

e

d

i

d

o

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

a

t

u

a

l

i

z

a

r

_

o

p

e

r

a

c

a

o

_

p

e

d

i

d

o

"

,

{

p

_

p

e

d

i

d

o

_

i

d

:

i

d

,

p

_

a

c

a

o

:

s

t

r

(

b

o

d

y

.

o

p

e

r

a

c

a

o

,

1

0

0

)

,

p

_

p

r

e

p

a

r

o

_

e

s

t

i

m

a

d

o

:

i

n

t

(

b

o

d

y

.

p

r

e

p

a

r

o

_

e

s

t

i

m

a

d

o

,

1

,

1

4

4

0

)

,

p

_

o

b

s

e

r

v

a

c

a

o

:

s

t

r

(

b

o

d

y

.

o

b

s

e

r

v

a

c

a

o

,

2

0

0

0

)

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

m

e

n

s

a

g

e

m

_

e

n

v

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

p

e

d

i

d

o

_

i

d

,

1

0

0

)

,

 

m

e

n

s

a

g

e

m

=

s

t

r

(

b

o

d

y

.

m

e

n

s

a

g

e

m

,

2

0

0

0

)

;




 

 

 

 

i

f

(

!

u

u

i

d

(

i

d

)

|

|

!

m

e

n

s

a

g

e

m

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

e

d

i

d

o

_

i

d

 

e

 

m

e

n

s

a

g

e

m

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

e

d

i

d

o

_

m

e

n

s

a

g

e

n

s

"

)

.

i

n

s

e

r

t

(

{

p

e

d

i

d

o

_

i

d

:

i

d

,

a

u

t

o

r

_

i

d

:

c

t

x

.

u

s

e

r

I

d

,

a

u

t

o

r

_

t

i

p

o

:

"

r

e

s

t

a

u

r

a

n

t

e

"

,

m

e

n

s

a

g

e

m

:

m

e

n

s

a

g

e

m

.

s

l

i

c

e

(

0

,

1

0

0

0

)

}

)

.

s

e

l

e

c

t

(

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

m

e

n

s

a

g

e

m

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

u

p

o

m

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

r

e

l

a

m

p

a

g

o

 

=

 

b

o

d

y

.

r

e

l

a

m

p

a

g

o

 

=

=

=

 

t

r

u

e

;




 

 

 

 

c

o

n

s

t

 

t

i

t

u

l

o

R

e

l

a

m

p

a

g

o

 

=

 

s

t

r

(

b

o

d

y

.

t

i

t

u

l

o

_

r

e

l

a

m

p

a

g

o

,

 

7

0

)

;




 

 

 

 

c

o

n

s

t

 

d

e

s

c

r

i

c

a

o

R

e

l

a

m

p

a

g

o

 

=

 

s

t

r

(

b

o

d

y

.

d

e

s

c

r

i

c

a

o

_

r

e

l

a

m

p

a

g

o

,

 

1

8

0

)

;




 

 

 

 

c

o

n

s

t

 

l

i

m

i

t

e

U

s

o

s

 

=

 

b

o

d

y

.

l

i

m

i

t

e

_

u

s

o

s

 

=

=

 

n

u

l

l

 

|

|

 

b

o

d

y

.

l

i

m

i

t

e

_

u

s

o

s

 

=

=

=

 

"

"

 

?

 

n

u

l

l

 

:

 

N

u

m

b

e

r

(

b

o

d

y

.

l

i

m

i

t

e

_

u

s

o

s

)

;




 

 

 

 

c

o

n

s

t

 

f

i

m

D

a

t

e

 

=

 

b

o

d

y

.

f

i

m

 

?

 

n

e

w

 

D

a

t

e

(

S

t

r

i

n

g

(

b

o

d

y

.

f

i

m

)

)

 

:

 

n

u

l

l

;




 

 

 

 

i

f

 

(

r

e

l

a

m

p

a

g

o

 

&

&

 

(




 

 

 

 

 

 

!

t

i

t

u

l

o

R

e

l

a

m

p

a

g

o

 

|

|

 

t

i

t

u

l

o

R

e

l

a

m

p

a

g

o

.

l

e

n

g

t

h

 

<

 

4




 

 

 

 

 

 

|

|

 

(

b

o

d

y

.

d

e

s

c

r

i

c

a

o

_

r

e

l

a

m

p

a

g

o

 

!

=

 

n

u

l

l

 

&

&

 

d

e

s

c

r

i

c

a

o

R

e

l

a

m

p

a

g

o

 

=

=

=

 

n

u

l

l

)




 

 

 

 

 

 

|

|

 

!

N

u

m

b

e

r

.

i

s

I

n

t

e

g

e

r

(

l

i

m

i

t

e

U

s

o

s

)

 

|

|

 

N

u

m

b

e

r

(

l

i

m

i

t

e

U

s

o

s

)

 

<

 

1




 

 

 

 

 

 

|

|

 

!

f

i

m

D

a

t

e

 

|

|

 

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

f

i

m

D

a

t

e

.

g

e

t

T

i

m

e

(

)

)

 

|

|

 

f

i

m

D

a

t

e

.

g

e

t

T

i

m

e

(

)

 

<

=

 

D

a

t

e

.

n

o

w

(

)




 

 

 

 

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

o

f

e

r

t

a

_

r

e

l

a

m

p

a

g

o

_

i

n

v

a

l

i

d

a

"

,

"

P

a

r

a

 

d

e

s

t

a

c

a

r

 

u

m

a

 

o

f

e

r

t

a

,

 

i

n

f

o

r

m

e

 

u

m

 

t

í

t

u

l

o

,

 

u

m

 

l

i

m

i

t

e

 

d

e

 

u

s

o

s

 

p

o

s

i

t

i

v

o

 

e

 

u

m

a

 

d

a

t

a

 

f

i

n

a

l

 

f

u

t

u

r

a

.

"

)

;




 

 

 

 

c

o

n

s

t

 

p

a

y

l

o

a

d

=

{

e

m

p

r

e

s

a

_

i

d

:

e

m

p

r

e

s

a

I

d

,

c

o

d

i

g

o

:

s

t

r

(

b

o

d

y

.

c

o

d

i

g

o

,

1

0

0

)

,

t

i

p

o

:

s

t

r

(

b

o

d

y

.

t

i

p

o

,

3

0

)

,

v

a

l

o

r

:

N

u

m

b

e

r

(

b

o

d

y

.

v

a

l

o

r

|

|

0

)

,

p

e

d

i

d

o

_

m

i

n

i

m

o

:

N

u

m

b

e

r

(

b

o

d

y

.

p

e

d

i

d

o

_

m

i

n

i

m

o

|

|

0

)

,

m

a

x

_

d

e

s

c

o

n

t

o

:

b

o

d

y

.

m

a

x

_

d

e

s

c

o

n

t

o

=

=

n

u

l

l

?

n

u

l

l

:

N

u

m

b

e

r

(

b

o

d

y

.

m

a

x

_

d

e

s

c

o

n

t

o

)

,

l

i

m

i

t

e

_

u

s

o

s

:

l

i

m

i

t

e

U

s

o

s

,

l

i

m

i

t

e

_

p

o

r

_

u

s

u

a

r

i

o

:

N

u

m

b

e

r

(

b

o

d

y

.

l

i

m

i

t

e

_

p

o

r

_

u

s

u

a

r

i

o

|

|

1

)

,

p

r

i

m

e

i

r

o

_

p

e

d

i

d

o

:

b

o

d

y

.

p

r

i

m

e

i

r

o

_

p

e

d

i

d

o

=

=

=

t

r

u

e

,

f

i

m

:

f

i

m

D

a

t

e

?

f

i

m

D

a

t

e

.

t

o

I

S

O

S

t

r

i

n

g

(

)

:

n

u

l

l

,

r

e

l

a

m

p

a

g

o

,

t

i

t

u

l

o

_

r

e

l

a

m

p

a

g

o

:

r

e

l

a

m

p

a

g

o

?

t

i

t

u

l

o

R

e

l

a

m

p

a

g

o

:

n

u

l

l

,

d

e

s

c

r

i

c

a

o

_

r

e

l

a

m

p

a

g

o

:

r

e

l

a

m

p

a

g

o

?

(

d

e

s

c

r

i

c

a

o

R

e

l

a

m

p

a

g

o

|

|

n

u

l

l

)

:

n

u

l

l

,

a

t

i

v

o

:

t

r

u

e

}

;




 

 

 

 

i

f

(

!

p

a

y

l

o

a

d

.

c

o

d

i

g

o

 

|

|

 

!

p

a

y

l

o

a

d

.

t

i

p

o

 

|

|

 

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

a

y

l

o

a

d

.

v

a

l

o

r

)

|

|

p

a

y

l

o

a

d

.

v

a

l

o

r

<

0

|

|

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

a

y

l

o

a

d

.

p

e

d

i

d

o

_

m

i

n

i

m

o

)

|

|

p

a

y

l

o

a

d

.

p

e

d

i

d

o

_

m

i

n

i

m

o

<

0

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

u

p

o

m

_

i

n

v

a

l

i

d

o

"

,

"

D

a

d

o

s

 

d

o

 

c

u

p

o

m

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

u

p

o

n

s

"

)

.

i

n

s

e

r

t

(

p

a

y

l

o

a

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

e

.

c

o

d

e

=

=

=

"

2

3

5

0

5

"

?

4

0

9

:

4

0

0

,

e

.

c

o

d

e

=

=

=

"

2

3

5

0

5

"

?

"

c

u

p

o

m

_

d

u

p

l

i

c

a

d

o

"

:

"

c

u

p

o

m

_

r

e

c

u

s

a

d

o

"

,

r

e

l

a

m

p

a

g

o

&

&

e

.

c

o

d

e

=

=

=

"

2

3

5

1

4

"

?

"

O

s

 

d

a

d

o

s

 

d

a

 

o

f

e

r

t

a

 

r

e

l

â

m

p

a

g

o

 

s

ã

o

 

i

n

v

á

l

i

d

o

s

.

"

:

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

u

p

o

m

_

t

o

g

g

l

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

c

u

p

o

m

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

u

p

o

n

s

"

)

.

u

p

d

a

t

e

(

{

a

t

i

v

o

:

b

o

d

y

.

a

t

i

v

o

=

=

=

t

r

u

e

,

u

p

d

a

t

e

d

_

a

t

:

n

e

w

 

D

a

t

e

(

)

.

t

o

I

S

O

S

t

r

i

n

g

(

)

}

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

u

p

o

m

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

u

p

o

m

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

c

u

p

o

m

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

u

p

o

n

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

u

p

o

m

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

a

v

a

l

i

a

c

a

o

_

r

e

s

p

o

n

d

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

a

v

a

l

i

a

ç

ã

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

r

e

t

u

r

n

 

r

p

c

(

c

t

x

.

d

b

,

c

t

x

.

r

e

q

u

e

s

t

,

"

e

m

p

r

e

s

a

_

r

e

s

p

o

n

d

e

r

_

a

v

a

l

i

a

c

a

o

"

,

{

p

_

a

v

a

l

i

a

c

a

o

_

i

d

:

i

d

,

p

_

r

e

s

p

o

s

t

a

:

s

t

r

(

b

o

d

y

.

r

e

s

p

o

s

t

a

,

1

0

0

0

)

|

|

n

u

l

l

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

c

a

t

e

g

o

r

i

a

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

c

a

t

e

g

o

r

i

a

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

u

p

d

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

u

p

d

a

t

e

(

{

c

a

t

e

g

o

r

i

a

_

i

d

:

n

u

l

l

}

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

e

q

(

"

c

a

t

e

g

o

r

i

a

_

i

d

"

,

i

d

)

;




 

 

 

 

i

f

(

u

p

d

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

a

t

e

g

o

r

i

a

_

r

e

c

u

s

a

d

a

"

,

u

p

d

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

;




 

 

 

 

c

o

n

s

t

 

d

e

l

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

c

a

t

e

g

o

r

i

a

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

;




 

 

 

 

r

e

t

u

r

n

 

d

e

l

.

e

r

r

o

r

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

a

t

e

g

o

r

i

a

_

r

e

c

u

s

a

d

a

"

,

d

e

l

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

r

o

d

u

t

o

_

d

i

s

p

o

n

i

b

i

l

i

d

a

d

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

p

r

o

d

u

t

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

u

p

d

a

t

e

(

{

d

i

s

p

o

n

i

v

e

l

:

b

o

d

y

.

d

i

s

p

o

n

i

v

e

l

=

=

=

t

r

u

e

}

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

r

o

d

u

t

o

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

p

r

o

d

u

t

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

a

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

g

r

u

p

o

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

p

r

o

d

u

t

o

_

i

d

"

,

i

d

)

;

 

i

f

(

a

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

r

e

c

u

s

a

d

o

"

,

a

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

;




 

 

 

 

c

o

n

s

t

 

b

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

p

r

o

d

u

t

o

_

i

d

"

,

i

d

)

;

 

i

f

(

b

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

r

e

c

u

s

a

d

o

"

,

b

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

;




 

 

 

 

c

o

n

s

t

 

d

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

;




 

 

 

 

r

e

t

u

r

n

 

d

.

e

r

r

o

r

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

r

o

d

u

t

o

_

r

e

c

u

s

a

d

o

"

,

d

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

v

a

r

i

a

n

t

e

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

I

d

=

s

t

r

(

b

o

d

y

.

p

r

o

d

u

t

o

_

i

d

,

1

0

0

)

,

 

n

o

m

e

=

s

t

r

(

b

o

d

y

.

n

o

m

e

,

1

2

0

)

;




 

 

 

 

c

o

n

s

t

 

p

r

e

c

o

=

N

u

m

b

e

r

(

b

o

d

y

.

p

r

e

c

o

)

,

 

p

r

o

m

o

c

a

o

=

b

o

d

y

.

p

r

o

m

o

c

a

o

=

=

n

u

l

l

|

|

b

o

d

y

.

p

r

o

m

o

c

a

o

=

=

=

"

"

?

n

u

l

l

:

N

u

m

b

e

r

(

b

o

d

y

.

p

r

o

m

o

c

a

o

)

;




 

 

 

 

i

f

(

!

u

u

i

d

(

p

r

o

d

u

t

o

I

d

)

|

|

!

n

o

m

e

|

|

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

r

e

c

o

)

|

|

p

r

e

c

o

<

0

|

|

(

p

r

o

m

o

c

a

o

!

=

=

n

u

l

l

&

&

(

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

r

o

m

o

c

a

o

)

|

|

p

r

o

m

o

c

a

o

<

=

0

|

|

p

r

o

m

o

c

a

o

>

=

p

r

e

c

o

)

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

a

r

i

a

n

t

e

_

i

n

v

a

l

i

d

a

"

,

"

D

a

d

o

s

 

d

a

 

v

a

r

i

a

ç

ã

o

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

s

e

l

e

c

t

(

"

i

d

,

e

m

p

r

e

s

a

_

i

d

"

)

.

e

q

(

"

i

d

"

,

p

r

o

d

u

t

o

I

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

;

 

i

f

(

p

r

o

d

u

t

o

.

e

r

r

o

r

|

|

!

p

r

o

d

u

t

o

.

d

a

t

a

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

4

,

"

p

r

o

d

u

t

o

_

n

a

o

_

e

n

c

o

n

t

r

a

d

o

"

,

"

P

r

o

d

u

t

o

 

n

ã

o

 

e

n

c

o

n

t

r

a

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

o

r

d

e

m

Q

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

s

e

l

e

c

t

(

"

i

d

"

)

.

e

q

(

"

p

r

o

d

u

t

o

_

i

d

"

,

p

r

o

d

u

t

o

I

d

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

i

n

s

e

r

t

(

{

p

r

o

d

u

t

o

_

i

d

:

p

r

o

d

u

t

o

I

d

,

n

o

m

e

,

p

r

e

c

o

,

p

r

o

m

o

c

a

o

,

o

r

d

e

m

:

(

o

r

d

e

m

Q

.

d

a

t

a

|

|

[

]

)

.

l

e

n

g

t

h

,

a

t

i

v

o

:

b

o

d

y

.

a

t

i

v

o

!

=

=

f

a

l

s

e

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

a

r

i

a

n

t

e

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

v

a

r

i

a

n

t

e

_

t

o

g

g

l

e

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

v

a

r

i

a

ç

ã

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

u

p

d

a

t

e

(

{

a

t

i

v

o

:

b

o

d

y

.

a

t

i

v

o

=

=

=

t

r

u

e

}

)

.

e

q

(

"

i

d

"

,

i

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

a

r

i

a

n

t

e

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

v

a

r

i

a

n

t

e

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

a

 

v

a

r

i

a

ç

ã

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

v

a

r

i

a

n

t

e

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

a

r

i

a

n

t

e

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

g

r

u

p

o

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

n

o

m

e

=

s

t

r

(

b

o

d

y

.

n

o

m

e

,

1

2

0

)

,

 

m

i

n

i

m

o

=

N

u

m

b

e

r

(

b

o

d

y

.

m

i

n

i

m

o

)

,

 

m

a

x

i

m

o

=

N

u

m

b

e

r

(

b

o

d

y

.

m

a

x

i

m

o

)

;




 

 

 

 

i

f

(

!

n

o

m

e

|

|

!

N

u

m

b

e

r

.

i

s

I

n

t

e

g

e

r

(

m

i

n

i

m

o

)

|

|

!

N

u

m

b

e

r

.

i

s

I

n

t

e

g

e

r

(

m

a

x

i

m

o

)

|

|

m

i

n

i

m

o

<

0

|

|

m

a

x

i

m

o

<

M

a

t

h

.

m

a

x

(

m

i

n

i

m

o

,

1

)

|

|

m

a

x

i

m

o

>

2

0

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

g

r

u

p

o

_

i

n

v

a

l

i

d

o

"

,

"

L

i

m

i

t

e

s

 

d

o

 

g

r

u

p

o

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

"

)

.

i

n

s

e

r

t

(

{

e

m

p

r

e

s

a

_

i

d

:

e

m

p

r

e

s

a

I

d

,

n

o

m

e

,

m

i

n

i

m

o

,

m

a

x

i

m

o

,

a

t

i

v

o

:

t

r

u

e

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

g

r

u

p

o

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

a

d

i

c

i

o

n

a

l

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

g

r

u

p

o

I

d

=

s

t

r

(

b

o

d

y

.

g

r

u

p

o

_

i

d

,

1

0

0

)

,

 

n

o

m

e

=

s

t

r

(

b

o

d

y

.

n

o

m

e

,

1

2

0

)

,

 

p

r

e

c

o

=

N

u

m

b

e

r

(

b

o

d

y

.

p

r

e

c

o

)

;




 

 

 

 

i

f

(

!

u

u

i

d

(

g

r

u

p

o

I

d

)

|

|

!

n

o

m

e

|

|

!

N

u

m

b

e

r

.

i

s

F

i

n

i

t

e

(

p

r

e

c

o

)

|

|

p

r

e

c

o

<

0

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

a

d

i

c

i

o

n

a

l

_

i

n

v

a

l

i

d

o

"

,

"

D

a

d

o

s

 

d

o

 

a

d

i

c

i

o

n

a

l

 

i

n

v

á

l

i

d

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

g

r

u

p

o

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

"

)

.

s

e

l

e

c

t

(

"

i

d

"

)

.

e

q

(

"

i

d

"

,

g

r

u

p

o

I

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

;

 

i

f

(

g

r

u

p

o

.

e

r

r

o

r

|

|

!

g

r

u

p

o

.

d

a

t

a

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

4

,

"

g

r

u

p

o

_

n

a

o

_

e

n

c

o

n

t

r

a

d

o

"

,

"

G

r

u

p

o

 

n

ã

o

 

e

n

c

o

n

t

r

a

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

a

d

i

c

i

o

n

a

i

s

"

)

.

i

n

s

e

r

t

(

{

g

r

u

p

o

_

i

d

:

g

r

u

p

o

I

d

,

n

o

m

e

,

p

r

e

c

o

,

a

t

i

v

o

:

t

r

u

e

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

a

d

i

c

i

o

n

a

l

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

a

d

i

c

i

o

n

a

l

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

a

d

i

c

i

o

n

a

l

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

a

d

i

c

i

o

n

a

i

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

a

d

i

c

i

o

n

a

l

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

r

o

d

u

t

o

_

g

r

u

p

o

_

c

r

i

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

I

d

=

s

t

r

(

b

o

d

y

.

p

r

o

d

u

t

o

_

i

d

,

1

0

0

)

,

 

g

r

u

p

o

I

d

=

s

t

r

(

b

o

d

y

.

g

r

u

p

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

p

r

o

d

u

t

o

I

d

)

|

|

!

u

u

i

d

(

g

r

u

p

o

I

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

r

o

d

u

t

o

_

i

d

 

e

 

g

r

u

p

o

_

i

d

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

[

p

,

g

]

=

a

w

a

i

t

 

P

r

o

m

i

s

e

.

a

l

l

(

[

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

s

"

)

.

s

e

l

e

c

t

(

"

i

d

"

)

.

e

q

(

"

i

d

"

,

p

r

o

d

u

t

o

I

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

,

c

t

x

.

d

b

.

f

r

o

m

(

"

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

"

)

.

s

e

l

e

c

t

(

"

i

d

"

)

.

e

q

(

"

i

d

"

,

g

r

u

p

o

I

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

]

)

;




 

 

 

 

i

f

(

p

.

e

r

r

o

r

|

|

g

.

e

r

r

o

r

|

|

!

p

.

d

a

t

a

|

|

!

g

.

d

a

t

a

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

4

,

"

v

i

n

c

u

l

o

_

i

n

v

a

l

i

d

o

"

,

"

P

r

o

d

u

t

o

 

o

u

 

g

r

u

p

o

 

n

ã

o

 

e

n

c

o

n

t

r

a

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

g

r

u

p

o

s

"

)

.

i

n

s

e

r

t

(

{

p

r

o

d

u

t

o

_

i

d

:

p

r

o

d

u

t

o

I

d

,

g

r

u

p

o

_

i

d

:

g

r

u

p

o

I

d

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

i

n

c

u

l

o

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

p

r

o

d

u

t

o

_

g

r

u

p

o

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

p

r

o

d

u

t

o

I

d

=

s

t

r

(

b

o

d

y

.

p

r

o

d

u

t

o

_

i

d

,

1

0

0

)

,

 

g

r

u

p

o

I

d

=

s

t

r

(

b

o

d

y

.

g

r

u

p

o

_

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

p

r

o

d

u

t

o

I

d

)

|

|

!

u

u

i

d

(

g

r

u

p

o

I

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

p

r

o

d

u

t

o

_

i

d

 

e

 

g

r

u

p

o

_

i

d

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

 

 

c

o

n

s

t

 

{

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

g

r

u

p

o

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

p

r

o

d

u

t

o

_

i

d

"

,

p

r

o

d

u

t

o

I

d

)

.

e

q

(

"

g

r

u

p

o

_

i

d

"

,

g

r

u

p

o

I

d

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

v

i

n

c

u

l

o

_

r

e

c

u

s

a

d

o

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

g

r

u

p

o

_

r

e

m

o

v

e

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

i

d

=

s

t

r

(

b

o

d

y

.

i

d

,

1

0

0

)

;

 

i

f

(

!

u

u

i

d

(

i

d

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

i

d

 

d

o

 

g

r

u

p

o

 

i

n

v

á

l

i

d

o

.

"

)

;




 

 

 

 

c

o

n

s

t

 

l

i

n

k

s

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

p

r

o

d

u

t

o

_

g

r

u

p

o

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

g

r

u

p

o

_

i

d

"

,

i

d

)

;

 

i

f

(

l

i

n

k

s

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

g

r

u

p

o

_

r

e

c

u

s

a

d

o

"

,

l

i

n

k

s

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

;




 

 

 

 

c

o

n

s

t

 

a

d

d

s

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

a

d

i

c

i

o

n

a

i

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

g

r

u

p

o

_

i

d

"

,

i

d

)

;

 

i

f

(

a

d

d

s

.

e

r

r

o

r

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

g

r

u

p

o

_

r

e

c

u

s

a

d

o

"

,

a

d

d

s

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

;




 

 

 

 

c

o

n

s

t

 

d

e

l

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

g

r

u

p

o

s

_

a

d

i

c

i

o

n

a

i

s

"

)

.

d

e

l

e

t

e

(

)

.

e

q

(

"

i

d

"

,

i

d

)

.

e

q

(

"

e

m

p

r

e

s

a

_

i

d

"

,

e

m

p

r

e

s

a

I

d

)

;

 

r

e

t

u

r

n

 

d

e

l

.

e

r

r

o

r

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

g

r

u

p

o

_

r

e

c

u

s

a

d

o

"

,

d

e

l

.

e

r

r

o

r

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

t

r

u

e

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

e

m

p

r

e

s

a

_

s

t

a

t

u

s

"

)

 

{




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

s

"

)

.

u

p

d

a

t

e

(

{

s

t

a

t

u

s

:

b

o

d

y

.

s

t

a

t

u

s

=

=

=

t

r

u

e

}

)

.

e

q

(

"

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

e

m

p

r

e

s

a

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

i

f

 

(

a

c

a

o

 

=

=

=

 

"

e

m

p

r

e

s

a

_

a

t

u

a

l

i

z

a

r

"

)

 

{




 

 

 

 

c

o

n

s

t

 

a

l

l

o

w

e

d

K

e

y

s

=

[

"

n

o

m

e

"

,

"

t

e

l

e

f

o

n

e

"

,

"

c

a

t

e

g

o

r

i

a

"

,

"

d

e

s

c

r

i

c

a

o

"

,

"

t

a

x

a

_

e

n

t

r

e

g

a

"

,

"

p

e

d

i

d

o

_

m

i

n

i

m

o

"

,

"

c

i

d

a

d

e

_

a

t

e

n

d

i

m

e

n

t

o

"

,

"

u

f

_

a

t

e

n

d

i

m

e

n

t

o

"

,

"

b

a

i

r

r

o

s

_

a

t

e

n

d

i

d

o

s

"

,

"

t

e

m

p

o

_

e

s

t

i

m

a

d

o

_

m

i

n

"

,

"

t

e

m

p

o

_

e

s

t

i

m

a

d

o

_

m

a

x

"

,

"

l

o

g

o

"

,

"

b

a

n

n

e

r

"

]

;




 

 

 

 

c

o

n

s

t

 

p

a

y

l

o

a

d

:

a

n

y

=

{

}

;

 

f

o

r

(

c

o

n

s

t

 

k

 

o

f

 

a

l

l

o

w

e

d

K

e

y

s

)

{

 

i

f

(

b

o

d

y

[

k

]

!

=

=

u

n

d

e

f

i

n

e

d

)

 

p

a

y

l

o

a

d

[

k

]

=

b

o

d

y

[

k

]

;

 

}




 

 

 

 

c

o

n

s

t

 

{

d

a

t

a

,

e

r

r

o

r

:

e

}

=

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

s

"

)

.

u

p

d

a

t

e

(

p

a

y

l

o

a

d

)

.

e

q

(

"

i

d

"

,

e

m

p

r

e

s

a

I

d

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

e

m

p

r

e

s

a

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

}

)

;




 

 

}




 

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

4

,

"

a

c

a

o

_

n

a

o

_

e

n

c

o

n

t

r

a

d

a

"

,

"

A

ç

ã

o

 

d

o

 

p

a

i

n

e

l

 

n

ã

o

 

e

n

c

o

n

t

r

a

d

a

.

"

)

;




}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

D

r

i

v

e

r

s

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

)

 

{

 

c

o

n

s

t

 

u

n

i

d

a

d

e

I

d

 

=

 

s

t

r

(

c

t

x

.

u

r

l

.

s

e

a

r

c

h

P

a

r

a

m

s

.

g

e

t

(

"

u

n

i

d

a

d

e

_

i

d

"

)

,

1

0

0

)

;

 

i

f

 

(

!

u

u

i

d

(

S

t

r

i

n

g

(

u

n

i

d

a

d

e

I

d

 

|

|

 

"

"

)

)

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

p

a

r

a

m

e

t

r

o

_

i

n

v

a

l

i

d

o

"

,

"

u

n

i

d

a

d

e

_

i

d

 

i

n

v

á

l

i

d

o

.

"

)

;

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

r

p

c

(

"

e

m

p

r

e

s

a

_

l

i

s

t

a

r

_

e

n

t

r

e

g

a

d

o

r

e

s

_

p

r

o

p

r

i

o

s

"

,

{

p

_

u

n

i

d

a

d

e

_

i

d

:

u

n

i

d

a

d

e

I

d

}

)

;

 

i

f

(

e

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

4

0

0

,

"

c

o

n

s

u

l

t

a

_

r

e

c

u

s

a

d

a

"

,

e

.

m

e

s

s

a

g

e

 

|

|

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

o

n

s

u

l

t

a

r

 

a

 

e

q

u

i

p

e

.

"

)

;

 

c

o

n

s

t

 

{

 

d

a

t

a

:

 

u

n

i

d

a

d

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

_

u

n

i

d

a

d

e

s

"

)

.

s

e

l

e

c

t

(

"

i

d

,

n

o

m

e

,

e

m

p

r

e

s

a

_

i

d

,

a

t

i

v

a

"

)

.

e

q

(

"

i

d

"

,

u

n

i

d

a

d

e

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

;

 

r

e

t

u

r

n

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

{

d

a

t

a

:

{

u

n

i

d

a

d

e

:

u

n

i

d

a

d

e

|

|

n

u

l

l

,

e

n

t

r

e

g

a

d

o

r

e

s

:

d

a

t

a

|

|

[

]

}

}

)

;

 

}







e

x

p

o

r

t

 

a

s

y

n

c

 

f

u

n

c

t

i

o

n

 

c

o

m

p

a

n

y

I

n

i

t

i

a

l

i

z

e

(

c

t

x

:

 

R

o

u

t

e

C

o

n

t

e

x

t

,

 

b

o

d

y

:

 

J

s

o

n

)

 

{




 

 

c

o

n

s

t

 

n

o

m

e

 

=

 

s

t

r

(

b

o

d

y

.

n

o

m

e

,

 

1

6

0

)

,

 

e

m

a

i

l

 

=

 

s

t

r

(

b

o

d

y

.

e

m

a

i

l

,

 

3

2

0

)

,

 

t

e

l

e

f

o

n

e

 

=

 

s

t

r

(

b

o

d

y

.

t

e

l

e

f

o

n

e

,

 

4

0

)

,

 

c

n

p

j

 

=

 

s

t

r

(

b

o

d

y

.

c

n

p

j

,

 

3

0

)

;




 

 

i

f

 

(

!

n

o

m

e

 

|

|

 

!

e

m

a

i

l

 

|

|

 

!

c

n

p

j

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

4

0

0

,

 

"

e

m

p

r

e

s

a

_

i

n

v

a

l

i

d

a

"

,

 

"

N

o

m

e

,

 

e

-

m

a

i

l

 

e

 

C

N

P

J

 

s

ã

o

 

o

b

r

i

g

a

t

ó

r

i

o

s

.

"

)

;




 

 

c

o

n

s

t

 

{

 

d

a

t

a

:

 

e

x

i

s

t

e

n

t

e

,

 

e

r

r

o

r

:

 

c

o

n

s

u

l

t

a

E

r

r

o

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

s

"

)

.

s

e

l

e

c

t

(

"

*

"

)

.

e

q

(

"

u

s

u

a

r

i

o

_

i

d

"

,

 

c

t

x

.

u

s

e

r

I

d

)

.

m

a

y

b

e

S

i

n

g

l

e

(

)

;




 

 

i

f

 

(

c

o

n

s

u

l

t

a

E

r

r

o

)

 

r

e

t

u

r

n

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

5

0

2

,

 

"

e

m

p

r

e

s

a

_

i

n

d

i

s

p

o

n

i

v

e

l

"

,

 

"

N

ã

o

 

f

o

i

 

p

o

s

s

í

v

e

l

 

c

o

n

s

u

l

t

a

r

 

o

 

r

e

s

t

a

u

r

a

n

t

e

.

"

)

;




 

 

i

f

 

(

e

x

i

s

t

e

n

t

e

)

 

r

e

t

u

r

n

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

:

 

e

x

i

s

t

e

n

t

e

 

}

)

;




 

 

c

o

n

s

t

 

{

 

d

a

t

a

,

 

e

r

r

o

r

:

 

e

 

}

 

=

 

a

w

a

i

t

 

c

t

x

.

d

b

.

f

r

o

m

(

"

e

m

p

r

e

s

a

s

"

)

.

i

n

s

e

r

t

(

{

 

u

s

u

a

r

i

o

_

i

d

:

 

c

t

x

.

u

s

e

r

I

d

,

 

n

o

m

e

,

 

e

m

a

i

l

,

 

t

e

l

e

f

o

n

e

:

 

t

e

l

e

f

o

n

e

 

|

|

 

n

u

l

l

,

 

c

n

p

j

,

 

s

t

a

t

u

s

:

 

f

a

l

s

e

,

 

t

a

x

a

_

e

n

t

r

e

g

a

:

 

0

,

 

p

e

d

i

d

o

_

m

i

n

i

m

o

:

 

0

 

}

)

.

s

e

l

e

c

t

(

"

*

"

)

.

s

i

n

g

l

e

(

)

;




 

 

r

e

t

u

r

n

 

e

 

?

 

e

r

r

o

r

(

c

t

x

.

r

e

q

u

e

s

t

,

 

e

.

c

o

d

e

 

=

=

=

 

"

2

3

5

0

5

"

 

?

 

4

0

9

 

:

 

4

0

0

,

 

"

e

m

p

r

e

s

a

_

r

e

c

u

s

a

d

a

"

,

 

e

.

m

e

s

s

a

g

e

)

 

:

 

r

e

s

p

o

n

s

e

(

c

t

x

.

r

e

q

u

e

s

t

,

 

{

 

d

a

t

a

 

}

,

 

2

0

1

)

;




}

