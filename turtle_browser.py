import math

operations = []
_trace = []
_operation_id = 0
_turtles = []
_default = None

def _record(action, *values):
    if len(_trace) >= 30000:
        raise RuntimeError("Too many drawing operations")
    _trace.append([action, *values])

def _add(*operation):
    global _operation_id
    _operation_id += 1
    operations.append([_operation_id, list(operation)])
    return _operation_id

def _color(*value):
    if len(value) == 1:
        value = value[0]
    if isinstance(value, str):
        return value
    r, g, b = value
    scale = 255 if max(value) <= 1 else 1
    return f"rgb({r*scale},{g*scale},{b*scale})"

class Turtle:
    def __init__(self):
        self._initialize()
        _turtles.append(self)

    def _initialize(self):
        self._x = self._y = self._angle = 0
        self._down = self._visible = True
        self._pen = self._fillcolor = '#182e3b'
        self._size = 1
        self._speed = 5
        self._fill = None
        self._drawn = []

    def _draw(self, *operation):
        ident = _add(*operation)
        self._drawn.append(ident)
        return ident

    def _pose(self):
        if self._visible:
            return ['cursor', self._x, self._y, self._angle, self._pen]
        return None

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        x, y = float(x), float(y)
        if not math.isfinite(x) or not math.isfinite(y):
            raise ValueError("Coordinates must be finite")
        drawing = ['line', self._x, self._y, x, y, self._pen, self._size] if self._down else None
        ident = self._draw(*drawing) if drawing else None
        if self._fill is not None:
            self._fill[0].append([x, y])
        self._x, self._y = x, y
        _record('move', ident, drawing, self._pose())

    def forward(self, distance):
        angle = math.radians(self._angle)
        self.goto(self._x + math.cos(angle)*distance, self._y + math.sin(angle)*distance)

    def backward(self, distance):
        self.forward(-distance)

    def left(self, angle):
        self.setheading(self._angle + angle)

    def right(self, angle):
        self.left(-angle)

    def setheading(self, angle):
        self._angle = angle % 360
        _record('pose', self._pose())

    def heading(self):
        return self._angle

    def position(self):
        return self._x, self._y

    def xcor(self):
        return self._x

    def ycor(self):
        return self._y

    def setx(self, x):
        self.goto(x, self._y)

    def sety(self, y):
        self.goto(self._x, y)

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def penup(self):
        self._down = False

    def pendown(self):
        self._down = True

    def isdown(self):
        return self._down

    def hideturtle(self):
        self._visible = False
        _record('pose', None)

    def showturtle(self):
        self._visible = True
        _record('pose', self._pose())

    def pensize(self, width=None):
        if width is None:
            return self._size
        self._size = max(0.1, float(width))

    def pencolor(self, *value):
        if not value:
            return self._pen
        self._pen = _color(*value)

    def fillcolor(self, *value):
        if not value:
            return self._fillcolor
        self._fillcolor = _color(*value)

    def color(self, *value):
        if not value:
            return self._pen, self._fillcolor
        if len(value) == 2:
            self.pencolor(value[0])
            self.fillcolor(value[1])
        else:
            self.pencolor(*value)
            self.fillcolor(*value)

    def begin_fill(self):
        if self._fill is None:
            points = [list(self.position())]
            ident = self._draw('fill', points[:0], self._fillcolor)
            self._fill = [points, ident, self._fillcolor]
            _record('draw', ident, ['fill', [], self._fillcolor], self._pose())

    def end_fill(self):
        if self._fill is not None:
            points, ident, color = self._fill
            for key, operation in operations:
                if key == ident:
                    operation[1].extend(points)
                    break
            _record('draw', ident, ['fill', points, color], self._pose())
            self._fill = None

    def circle(self, radius, extent=360, steps=None):
        if not radius:
            return
        extent = 360 if extent is None else extent
        steps = max(1, min(10000, int(steps if steps is not None else math.ceil(abs(extent)/4))))
        turn = extent / steps * (1 if radius > 0 else -1)
        chord = 2 * abs(radius) * math.sin(math.radians(extent / steps / 2))
        self.left(turn / 2)
        for _ in range(steps):
            self.forward(chord)
            self.left(turn)
        self.right(turn / 2)

    def dot(self, size=None, *color):
        if isinstance(size, str):
            color, size = (size,), None
        self._paint('dot', self._x, self._y, max(0, size if size is not None else max(self._size+4, self._size*2)), _color(*color) if color else self._pen)

    def write(self, arg, move=False, align='left', font=('Arial', 12, 'normal')):
        if move:
            raise NotImplementedError("write(move=True) is unavailable")
        self._paint('text', self._x, self._y, str(arg), self._pen, font[1], align)

    def _paint(self, *operation):
        ident = self._draw(*operation)
        _record('draw', ident, operation, self._pose())

    def speed(self, value=None):
        if value is None:
            return self._speed
        self._speed = value

    def clear(self):
        owned = set(self._drawn)
        operations[:] = [(key, operation) for key, operation in operations if key not in owned]
        _record('clear', self._drawn[:], self._pose())
        self._drawn.clear()
        self._fill = None

    def reset(self):
        self.clear()
        self._initialize()
        _record('pose', self._pose())

    fd = forward
    bk = back = backward
    lt = left
    rt = right
    setpos = setposition = goto
    pos = position
    seth = setheading
    up = pu = penup
    down = pd = pendown
    ht = hideturtle
    st = showturtle
    width = pensize

class Screen:
    def bgcolor(self, *value):
        if not value:
            return next((op[1] for _, op in reversed(operations) if op[0] == 'background'), '#fcfdff')
        operation = ['background', _color(*value)]
        _record('draw', _add(*operation), operation)

    def mainloop(self):
        pass

    def update(self):
        pass

    def tracer(self, *args):
        pass

    def title(self, text):
        pass

def done():
    pass

mainloop = done
bgcolor = Screen().bgcolor
tracer = Screen().tracer
update = Screen().update

def _bind(name):
    def command(*args, **kwargs):
        global _default
        if _default is None:
            _default = Turtle()
        return getattr(_default, name)(*args, **kwargs)
    return command

for _name in dir(Turtle):
    if not _name.startswith('_'):
        globals()[_name] = _bind(_name)

def _execute(source):
    import contextlib
    import io
    import json
    import sys
    import traceback
    global _default, _operation_id
    _default = None
    _operation_id = 0
    _trace.clear()
    _turtles.clear()
    operations.clear()
    sys.modules['turtle'] = sys.modules[__name__]
    class Output(io.StringIO):
        def write(self, data):
            return super().write(data[:max(0, 4000-self.tell())])
    output = Output()
    error = ''
    try:
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exec(compile(source, '<โค้ด Python>', 'exec'), {'__name__': '__main__'})
    except BaseException as exc:
        error = ''.join(traceback.format_exception(type(exc), exc, exc.__traceback__.tb_next))
    cursors = [['cursor', t._x, t._y, t._angle, t._pen] for t in _turtles if t._visible]
    return json.dumps(dict(operations=[op for _, op in operations]+cursors, steps=_trace, output=output.getvalue(), error=error))
