import datetime
import math
import random
import scipy.interpolate

print("~Monthly")
print("  income   -$100")
print("  expenses:fun   $200")
print("  expenses:gas   $200")
print("  assets:checking")
print("")

print("~Monthly from 2000/1/1 to 2010/1/1")
print("  expenses:rent   $1000")
print("  assets:checking")
print("")

print("~Monthly from 2010/1/2 to 2020/1/1")
print("  expenses:rent   $1500")
print("  assets:checking")
print("")

print("~Weekly")
print("  expenses:groceries   $100")
print("  assets:checking")
print("")

start_date = datetime.date(2000,1,1)
end_date = datetime.date(2015,7,30)

dates = [datetime.date(2000,1,1),
        datetime.date(2005,1,1),
        datetime.date(2007,1,1),
        datetime.date(2009,1,1),
        datetime.date(2011,1,1),
        datetime.date(2013,1,1),
        datetime.date(2016,1,1)]
base = [100, 102, 104, 105, 106, 107, 110]

fn = scipy.interpolate.UnivariateSpline([d.toordinal() for d in dates], base)

d = start_date
while (d < end_date):
    print(str(d) + " me")
    amount = round(float(fn(d.toordinal())), 2)
    print("  income   -$" + str(amount))
    print("  assets:checking   $" + str(amount))
    print("")
    d = d + datetime.timedelta(0,0,0,0,0,0,4)

dates = [datetime.date(2000,1,1),
        datetime.date(2004,1,1),
        datetime.date(2005,1,1),
        datetime.date(2006,1,1),
        datetime.date(2007,1,1),
        datetime.date(2008,1,1),
        datetime.date(2009,1,1),
        datetime.date(2010,1,1),
        datetime.date(2011,1,1),
        datetime.date(2012,1,1),
        datetime.date(2013,1,1),
        datetime.date(2014,1,1),
        datetime.date(2015,1,1),
        datetime.date(2016,1,1)]
base = [2,
        2.5,
        2.5,
        2.8,
        3.5,
        4.5,
        2.5,
        3,
        4.5,
        4,
        4,
        3.5,
        3,
        3.5]

fn = scipy.interpolate.UnivariateSpline([d.toordinal() for d in dates], base)

d = start_date
while (d < end_date):
    i = math.floor(random.uniform(0,3))
    if (i == 0):
        station = "BP"
    elif (i == 1):
        station = "Shell"
    elif (i == 2):
        station = "Pilot"

    noise = random.uniform(0.9, 1.1)
    amount = round(20*noise*float(fn(d.toordinal())), 2)
    print(str(d) + " " + station)
    print("  assets:checking   -$" + str(amount))
    print("  expenses:gas   $" + str(amount))
    print("")
    i = math.floor(random.uniform(7, 13))
    d = d + datetime.timedelta(i,0,0,0,0,0,0)

dates = [datetime.date(2000,1,1),
        datetime.date(2004,1,1),
        datetime.date(2009,1,1),
        datetime.date(2016,1,1)]
base = [2,
        3,
        4,
        6]

fn = scipy.interpolate.UnivariateSpline([d.toordinal() for d in dates], base)

d = start_date
while (d < end_date):
    i = math.floor(random.uniform(0,3))
    if (i == 0):
        store = "Safeway"
    elif (i == 1):
        store = "Piggly Wiggly"
    elif (i == 2):
        store = "Harris Teeter"

    noise = random.uniform(0.9, 1.1)
    amount = round(25*noise*float(fn(d.toordinal())), 2)
    print(str(d) + " " + store)
    print("  assets:checking   -$" + str(amount))
    print("  expenses:groceries   $" + str(amount))
    print("")
    i = math.floor(random.uniform(7, 13))
    d = d + datetime.timedelta(i,0,0,0,0,0,0)

dates = [datetime.date(2000,1,1),
        datetime.date(2004,1,1),
        datetime.date(2009,1,1),
        datetime.date(2016,1,1)]
base = [1,
        10,
        15,
        6]

fn = scipy.interpolate.UnivariateSpline([d.toordinal() for d in dates], base)

d = start_date
while (d < end_date):
    i = math.floor(random.uniform(0,3))
    if (i == 0):
        payee = "Movies 8"
    elif (i == 1):
        payee = "Scoops Lounge"
    elif (i == 2):
        payee = "Karts+"

    noise = random.uniform(0.9, 1.1)
    amount = round(30*noise*float(fn(d.toordinal())), 2)
    print(str(d) + " " + payee)
    print("  assets:checking   -$" + str(amount))
    print("  expenses:fun   $" + str(amount))
    print("")
    i = math.floor(random.uniform(13, 25))
    d = d + datetime.timedelta(i,0,0,0,0,0,0)

dates = [datetime.date(2000,1,1),
        datetime.date(2004,1,1),
        datetime.date(2009,1,1),
        datetime.date(2016,1,1)]
base = [400,
        500,
        700,
        1500]

fn = scipy.interpolate.interp1d([d.toordinal() for d in dates], base, kind="nearest")

d = start_date
while (d < end_date):
    if (datetime.date(2000, 1, 1) <= d and d <= datetime.date(2005,1,1)):
        apt = "Alpine Mgmt"
    elif (datetime.date(2005, 1, 1) < d and d <= datetime.date(2010,1,1)):
        apt = "Clearwater Apartments"
    elif (datetime.date(2010, 1, 1) < d and d <= datetime.date(2016,1,1)):
        apt = "Sound Living"

    amount = round(float(fn(d.toordinal())), 0)
    print(str(d) + " " + apt)
    print("  assets:checking   -$" + str(amount))
    print("  expenses:rent   $" + str(amount))
    print("")
    if (d.month == 12):
        d = datetime.date(d.year+1, 1, d.day)
    else:
        d = datetime.date(d.year, d.month+1, d.day)

