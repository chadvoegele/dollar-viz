import { Table } from './table'
import { chart } from './chart'

function main () {
  if (document.getElementById('thetable')) {
    window.table = new Table()
    window.table.load(document)
  }
  if (document.getElementById('the_graph')) {
    chart.setup_page()
  }
}

main()
